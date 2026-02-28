import db from '../db';

export const getCustomers = (req: any, res: any) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
  res.json(customers);
};

export const createCustomer = (req: any, res: any) => {
  const { name, email, phone, address } = req.body;
  try {
    const result = db.prepare('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)').run(name, email, phone, address);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCustomerHistory = (req: any, res: any) => {
  const sales = db.prepare(`
    SELECT s.*, u.name as staff_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.customer_id = ? 
    ORDER BY s.created_at DESC
  `).all(req.params.id);
  res.json(sales);
};
