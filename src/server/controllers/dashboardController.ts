import db from '../db';

export const getStats = (req: any, res: any) => {
  const today = new Date().toISOString().split('T')[0];
  
  const totalSalesToday = db.prepare("SELECT SUM(final_amount) as total FROM sales WHERE date(created_at) = ?").get(today);
  const totalExpensesToday = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE date = ?").get(today);
  const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 1").get();
  const lowStockCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_threshold AND is_approved = 1").get();
  
  let pendingApprovals = 0;
  if (req.user.role === 'admin') {
    const pending = db.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 0").get();
    pendingApprovals = pending.count;
  }
  
  // Monthly sales for chart
  const monthlySales = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(final_amount) as total 
    FROM sales 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all();

  // Monthly expenses for comparison
  const monthlyExpenses = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total 
    FROM expenses 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all();

  const popularProducts = db.prepare(`
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `).all();

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
