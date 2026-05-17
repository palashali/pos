import db from '../db';

export const createSale = (req: any, res: any) => {
  const { customer_id, items, total_amount, discount, tax, final_amount, payment_method, location_id } = req.body;
  const user_id = req.user.id;

  const transaction = db.transaction(() => {
    const defaultLocation = location_id || (db.prepare('SELECT id FROM locations LIMIT 1').get() as any)?.id;

    // 1. Check Store Credit if used
    if (payment_method === 'store_credit' && customer_id) {
      const customer: any = db.prepare('SELECT store_credit FROM customers WHERE id = ?').get(customer_id);
      if (!customer || customer.store_credit < final_amount) {
        throw new Error('Insufficient store credit');
      }
      db.prepare('UPDATE customers SET store_credit = store_credit - ? WHERE id = ?').run(final_amount, customer_id);
    }

    // 2. Create Sale record
    const saleResult = db.prepare(`
      INSERT INTO sales (user_id, customer_id, total_amount, discount, tax, final_amount, payment_method, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, customer_id, total_amount, discount, tax, final_amount, payment_method, defaultLocation);

    const saleId = saleResult.lastInsertRowid;

    // 3. Create Sale Items and Update Stock
    for (const item of items) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, location_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal, defaultLocation);

      // Reduce stock at location
      const stockExists = db.prepare('SELECT stock FROM product_stocks WHERE product_id = ? AND location_id = ?').get(item.product_id, defaultLocation) as any;
      if (!stockExists || stockExists.stock < item.quantity) {
        // Fallback for demo: if no location-specific stock defined yet, just reduce global
        // In production we should enforce stock presence at location
      }
      
      if (stockExists) {
        db.prepare('UPDATE product_stocks SET stock = stock - ? WHERE product_id = ? AND location_id = ?').run(item.quantity, item.product_id, defaultLocation);
      } else {
        // If not exists, create with negative if we allow overselling or fail
        db.prepare('INSERT INTO product_stocks (product_id, location_id, stock) VALUES (?, ?, ?)').run(item.product_id, defaultLocation, -item.quantity);
      }

      // Reduce Global Stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);

      // Log Stock Out
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        item.product_id,
        user_id,
        'out',
        item.quantity,
        `Sale #${saleId}`,
        defaultLocation
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
  let query = `
    SELECT s.*, u.name as staff_name, c.name as customer_name, c.phone as customer_phone, c.customer_code
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
  `;
  const params: any[] = [];
  
  if (req.user && req.user.role === 'staff') {
    query += ` WHERE s.user_id = ? `;
    params.push(req.user.id);
  }
  
  query += ` ORDER BY s.created_at DESC`;

  const sales = db.prepare(query).all(...params);
  res.json(sales);
};

export const getSaleDetails = (req: any, res: any) => {
  const sale = db.prepare(`
    SELECT s.*, u.name as staff_name, c.name as customer_name, c.phone as customer_phone, c.customer_code
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `).get(req.params.id) as any;

  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  // Removed staff restriction to allow returns and lookup by anyone authorized
  
  const items = db.prepare(`
    SELECT si.*, p.name as product_name 
    FROM sale_items si 
    JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ?
  `).all(req.params.id);

  res.json({ ...sale, items });
};
