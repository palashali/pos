import db from '../db';

export const createSale = (req: any, res: any) => {
  const { customer_id, items, total_amount, discount, tax, final_amount, payment_method } = req.body;
  const user_id = req.user.id;

  const transaction = db.transaction(() => {
    // 1. Create Sale record
    const saleResult = db.prepare(`
      INSERT INTO sales (user_id, customer_id, total_amount, discount, tax, final_amount, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, customer_id, total_amount, discount, tax, final_amount, payment_method);

    const saleId = saleResult.lastInsertRowid;

    // 2. Create Sale Items and Update Stock
    for (const item of items) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal);

      // Reduce Stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);

      // Log Stock Out
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(
        item.product_id,
        user_id,
        'out',
        item.quantity,
        `Sale #${saleId}`
      );
    }

    return saleId;
  });

  try {
    const saleId = transaction();
    res.status(201).json({ id: saleId, message: 'Sale completed successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSales = (req: any, res: any) => {
  const sales = db.prepare(`
    SELECT s.*, u.name as staff_name, c.name as customer_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sales);
};

export const getSaleDetails = (req: any, res: any) => {
  const sale = db.prepare(`
    SELECT s.*, u.name as staff_name, c.name as customer_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!sale) return res.status(404).json({ message: 'Sale not found' });

  const items = db.prepare(`
    SELECT si.*, p.name as product_name 
    FROM sale_items si 
    JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items });
};
