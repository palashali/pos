import db from '../db';

export const getCustomers = (req: any, res: any) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
  res.json(customers);
};

export const createCustomer = (req: any, res: any) => {
  let { name, email, phone, address, customer_code } = req.body;
  
  // Auto-generate customer code if not provided
  if (!customer_code) {
    const lastCustomer = db.prepare('SELECT id FROM customers ORDER BY id DESC LIMIT 1').get() as any;
    const nextId = (lastCustomer?.id || 0) + 1;
    customer_code = `CUS-${String(nextId).padStart(4, '0')}`;
  }

  try {
    const result = db.prepare('INSERT INTO customers (name, email, phone, address, customer_code) VALUES (?, ?, ?, ?, ?)').run(name, email, phone, address, customer_code);
    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCustomerHistory = (req: any, res: any) => {
  let query = `
    SELECT s.*, u.name as staff_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.customer_id = ? 
  `;
  const params: any[] = [req.params.id];

  if (req.user && req.user.role === 'staff') {
    query += ` AND s.user_id = ? `;
    params.push(req.user.id);
  }

  query += ` ORDER BY s.created_at DESC `;

  const sales = db.prepare(query).all(...params);
  res.json(sales);
};

export const updateCustomer = (req: any, res: any) => {
  const { name, email, phone, address, customer_code } = req.body;
  const { id } = req.params;
  try {
    db.prepare('UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, customer_code = ? WHERE id = ?').run(name, email, phone, address, customer_code, id);
    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });
    res.json(updatedCustomer);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
