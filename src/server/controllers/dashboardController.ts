import db from '../db';

export const getStats = (req: any, res: any) => {
  const today = new Date().toISOString().split('T')[0];
  
  let salesQuery = `
    SELECT (
      (SELECT COALESCE(SUM(final_amount), 0) FROM sales WHERE date(created_at) = ?) -
      (SELECT COALESCE(SUM(refund_amount), 0) FROM sale_returns WHERE date(created_at) = ?)
    ) as total
  `;
  let salesParams: any[] = [today, today];
  if (req.user && req.user.role === 'staff') {
    salesQuery = `
      SELECT (
        (SELECT COALESCE(SUM(final_amount), 0) FROM sales WHERE date(created_at) = ? AND user_id = ?) -
        (SELECT COALESCE(SUM(refund_amount), 0) FROM sale_returns WHERE date(created_at) = ? AND user_id = ?)
      ) as total
    `;
    salesParams = [today, req.user.id, today, req.user.id];
  }
  const totalSalesToday = db.prepare(salesQuery).get(...salesParams) as any;

  let monthlySalesQuery = `
    SELECT month, SUM(net_amount) as total
    FROM (
      SELECT strftime('%Y-%m', created_at) as month, final_amount as net_amount FROM sales
      UNION ALL
      SELECT strftime('%Y-%m', created_at) as month, -refund_amount as net_amount FROM sale_returns
    )
  `;
  let monthlySalesParams: any[] = [];
  // Note: union filter by user_id needs more complex query
  if (req.user && req.user.role === 'staff') {
    monthlySalesQuery = `
      SELECT month, SUM(net_amount) as total
      FROM (
        SELECT strftime('%Y-%m', created_at) as month, final_amount as net_amount FROM sales WHERE user_id = ?
        UNION ALL
        SELECT strftime('%Y-%m', created_at) as month, -refund_amount as net_amount FROM sale_returns WHERE user_id = ?
      )
    `;
    monthlySalesParams = [req.user.id, req.user.id];
  }
  monthlySalesQuery += `
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `;
  const monthlySales = db.prepare(monthlySalesQuery).all(...monthlySalesParams);

  let totalExpensesQuery = "SELECT SUM(amount) as total FROM expenses WHERE date = ?";
  let totalExpensesParams: any[] = [today];
  if (req.user && req.user.role === 'staff') {
    totalExpensesQuery = "SELECT SUM(amount) as total FROM expenses WHERE date = ? AND user_id = ?";
    totalExpensesParams.push(req.user.id);
  }
  const totalExpensesToday = db.prepare(totalExpensesQuery).get(...totalExpensesParams) as any;

  const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 1").get() as any;
  const lowStockCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_threshold AND is_approved = 1").get() as any;
  
  let pendingApprovals = 0;
  if (req.user && req.user.role?.toLowerCase() === 'admin') {
    const productsPending = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 0").get() as any;
    const adjustmentsPending = db.prepare("SELECT COUNT(*) as count FROM stock_adjustments WHERE status = 'Pending'").get() as any;
    const returnsPending = db.prepare("SELECT COUNT(*) as count FROM sale_returns WHERE status = 'Pending'").get() as any;
    pendingApprovals = productsPending.count + adjustmentsPending.count + returnsPending.count;
  }
  
  // Monthly expenses for comparison
  let monthlyExpensesQuery = `
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total 
    FROM expenses 
  `;
  let monthlyExpensesParams: any[] = [];
  if (req.user && req.user.role === 'staff') {
    monthlyExpensesQuery += ` WHERE user_id = ? `;
    monthlyExpensesParams.push(req.user.id);
  }
  monthlyExpensesQuery += `
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `;
  const monthlyExpenses = db.prepare(monthlyExpensesQuery).all(...monthlyExpensesParams);

  let popularProductsQuery = `
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
  `;
  let popularProductsParams: any[] = [];
  if (req.user && req.user.role === 'staff') {
    popularProductsQuery += ` WHERE s.user_id = ? `;
    popularProductsParams.push(req.user.id);
  }
  popularProductsQuery += `
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `;
  const popularProducts = db.prepare(popularProductsQuery).all(...popularProductsParams);

  const lowStockItems = db.prepare(`
    SELECT name, stock, low_stock_threshold
    FROM products
    WHERE stock <= low_stock_threshold
    ORDER BY stock ASC
    LIMIT 5
  `).all();

  res.json({
    todaySales: totalSalesToday.total || 0,
    todayExpenses: totalExpensesToday.total || 0,
    totalProducts: totalProducts.count,
    lowStockCount: lowStockCount.count,
    pendingApprovals,
    monthlySales: monthlySales.reverse(),
    monthlyExpenses: monthlyExpenses.reverse(),
    popularProducts,
    lowStockItems
  });
};
