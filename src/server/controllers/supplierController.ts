import db from "../db";

export const getSuppliers = (req: any, res: any) => {
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplier = (req: any, res: any) => {
  const { name, phone, email, address } = req.body;
  try {
    const result = db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)').run(name, phone, email, address);
    res.json({ id: result.lastInsertRowid, message: 'Supplier created successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createSupplierReturn = (req: any, res: any) => {
  const { supplier_id, product_id, location_id, quantity, refund_amount, refund_method, reason } = req.body;
  const user_id = req.user.id;
  const isAdmin = req.user.role?.toLowerCase() === 'admin';

  try {
    const transaction = db.transaction(() => {
      // 1. Create return record
      const status = isAdmin ? 'Approved' : 'Pending';
      const result = db.prepare(`
        INSERT INTO supplier_returns (supplier_id, product_id, location_id, quantity, refund_amount, refund_method, reason, user_id, status, approved_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(supplier_id, product_id, location_id, quantity, refund_amount, refund_method, reason, user_id, status, status === 'Approved' ? user_id : null);

      if (status === 'Approved') {
        // 2. Reduce stock at location
        const stockRecord = db.prepare('SELECT stock FROM product_stocks WHERE product_id = ? AND location_id = ?').get(product_id, location_id) as any;
        if (!stockRecord || stockRecord.stock < quantity) {
          throw new Error('Insufficient stock at selected location');
        }

        db.prepare('UPDATE product_stocks SET stock = stock - ? WHERE product_id = ? AND location_id = ?').run(quantity, product_id, location_id);
        
        // Update global stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

        // adjust supplier balance if needed
        if (refund_method === 'adjustment') {
          db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(refund_amount, supplier_id);
        }

        // 3. Log stock movement
        db.prepare(`
          INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
          VALUES (?, ?, 'Return', ?, ?, ?)
        `).run(product_id, user_id, -quantity, `Purchase Return to Supplier (ID: ${supplier_id})`, location_id);
      }
    });

    transaction();
    res.json({ message: isAdmin ? 'Supplier return approved and stock updated' : 'Supplier return submitted for approval' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSupplierReturns = (req: any, res: any) => {
  try {
    const returns = db.prepare(`
      SELECT sr.*, s.name as supplier_name, p.name as product_name, l.name as location_name, u.name as staff_name
      FROM supplier_returns sr
      JOIN suppliers s ON s.id = sr.supplier_id
      JOIN products p ON p.id = sr.product_id
      JOIN locations l ON l.id = sr.location_id
      JOIN users u ON u.id = sr.user_id
      ORDER BY sr.created_at DESC
    `).all();
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
