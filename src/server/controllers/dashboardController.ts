import db from '../db';

export const getStats = (req: any, res: any) => {
  const today = new Date().toISOString().split('T')[0];
  
  let salesQuery = "SELECT SUM(final_amount) as total FROM sales WHERE date(created_at) = ?";
  let salesParams: any[] = [today];
  if (req.user && req.user.role === 'staff') {
    salesQuery = "SELECT SUM(final_amount) as total FROM sales WHERE date(created_at) = ? AND user_id = ?";
    salesParams.push(req.user.id);
  }
  const totalSalesToday = db.prepare(salesQuery).get(...salesParams) as any;

  let monthlySalesQuery = `
    SELECT strftime('%Y-%m', created_at) as month, SUM(final_amount) as total 
    FROM sales 
  `;
  let monthlySalesParams: any[] = [];
  if (req.user && req.user.role === 'staff') {
    monthlySalesQuery += ` WHERE user_id = ? `;
    monthlySalesParams.push(req.user.id);
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
  if (req.user && req.user.role === 'admin') {
    const pending = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 0").get() as any;
    pendingApprovals = pending.count;
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
