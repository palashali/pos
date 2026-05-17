import db from '../db';

export const getStockAdjustments = (req: any, res: any) => {
  try {
    const adjustments = db.prepare(`
      SELECT sa.*, p.name as product_name, u.name as staff_name, a.name as approver_name
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      JOIN users u ON sa.user_id = u.id
      LEFT JOIN users a ON sa.approved_by = a.id
      ORDER BY sa.created_at DESC
    `).all();
    res.json(adjustments);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createStockAdjustment = (req: any, res: any) => {
  const { product_id, type, quantity, reason, location_id } = req.body;
  const user_id = req.user.id;
  const isAdmin = req.user.role?.toLowerCase() === 'admin';

  try {
    const defaultLocation = location_id || (db.prepare('SELECT id FROM locations LIMIT 1').get() as any)?.id;
    
    // Any staff negative adjustment requires admin approval
    const status = isAdmin ? 'Approved' : (quantity < 0 ? 'Pending' : 'Approved');
    const approved_by = status === 'Approved' ? user_id : null;

    const result = db.prepare(`
      INSERT INTO stock_adjustments (product_id, user_id, type, quantity, reason, status, approved_by, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(product_id, user_id, type, quantity, reason, status, approved_by, defaultLocation);

    if (status === 'Approved') {
      db.transaction(() => {
        // Update product stock at location
        const stockExists = db.prepare('SELECT id FROM product_stocks WHERE product_id = ? AND location_id = ?').get(product_id, defaultLocation);
        if (stockExists) {
          db.prepare('UPDATE product_stocks SET stock = stock + ? WHERE product_id = ? AND location_id = ?').run(quantity, product_id, defaultLocation);
        } else {
          db.prepare('INSERT INTO product_stocks (product_id, location_id, stock) VALUES (?, ?, ?)').run(product_id, defaultLocation, quantity);
        }

        // Update global stock
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, product_id);
        
        // Log stock change
        db.prepare(`
          INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
          VALUES (?, ?, 'Adjustment', ?, ?, ?)
        `).run(product_id, user_id, quantity, `Manual Adjustment: ${type} - ${reason}`, defaultLocation);
      })();
    }

    res.json({ message: status === 'Approved' ? 'Adjustment applied' : 'Adjustment pending admin approval' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const approveStockAdjustment = (req: any, res: any) => {
  if (req.user.role?.toLowerCase() !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { id } = req.params;
  const { action } = req.body; // 'Approved' or 'Rejected'

  try {
    const adjustment: any = db.prepare('SELECT * FROM stock_adjustments WHERE id = ?').get(id);
    if (!adjustment) return res.status(404).json({ message: 'Adjustment not found' });
    if (adjustment.status !== 'Pending') return res.status(400).json({ message: 'Already processed' });

    if (action === 'Approved') {
      db.transaction(() => {
        db.prepare('UPDATE stock_adjustments SET status = "Approved", approved_by = ? WHERE id = ?')
          .run(req.user.id, id);
        
        const locId = adjustment.location_id;
        const prodId = adjustment.product_id;
        const qty = adjustment.quantity;

        // Update location stock
        const stockExists = db.prepare('SELECT id FROM product_stocks WHERE product_id = ? AND location_id = ?').get(prodId, locId);
        if (stockExists) {
          db.prepare('UPDATE product_stocks SET stock = stock + ? WHERE product_id = ? AND location_id = ?').run(qty, prodId, locId);
        } else {
          db.prepare('INSERT INTO product_stocks (product_id, location_id, stock) VALUES (?, ?, ?)').run(prodId, locId, qty);
        }

        // Update global stock
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, prodId);
          
        db.prepare(`
          INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
          VALUES (?, ?, 'Adjustment', ?, ?, ?)
        `).run(prodId, req.user.id, qty, `Approved Adjustment: ${adjustment.type}`, locId);
      })();
    } else {
      db.prepare('UPDATE stock_adjustments SET status = "Rejected", approved_by = ? WHERE id = ?')
        .run(req.user.id, id);
    }

    res.json({ message: `Adjustment ${action}` });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
