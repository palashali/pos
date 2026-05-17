import db from '../db';

// --- CUSTOMER RETURNS ---

export const getSaleReturns = (req: any, res: any) => {
  try {
    const returns = db.prepare(`
      SELECT sr.*, s.id as sale_id, u.name as staff_name, c.name as customer_name, c.customer_code, l.name as location_name
      FROM sale_returns sr
      JOIN sales s ON sr.sale_id = s.id
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN locations l ON sr.location_id = l.id
      ORDER BY sr.created_at DESC
    `).all();
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSaleReturnDetails = (req: any, res: any) => {
  try {
    const { id } = req.params;
    const saleReturn: any = db.prepare(`
      SELECT sr.*, s.id as sale_id, u.name as staff_name, c.name as customer_name, c.phone as customer_phone, c.customer_code
      FROM sale_returns sr
      JOIN sales s ON sr.sale_id = s.id
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE sr.id = ?
    `).get(id);

    if (!saleReturn) return res.status(404).json({ message: 'Return not found' });

    const items = db.prepare(`
      SELECT sri.*, p.name as product_name, si.unit_price as original_price
      FROM sale_return_items sri
      JOIN products p ON sri.product_id = p.id
      JOIN sale_returns sr ON sri.sale_return_id = sr.id
      JOIN sale_items si ON sr.sale_id = si.sale_id AND sri.product_id = si.product_id
      WHERE sri.sale_return_id = ?
    `).all(id);

    res.json({ ...saleReturn, items });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSaleReturn = (req: any, res: any) => {
  const { sale_id, items, refund_method, reason, location_id } = req.body;
  const user_id = req.user.id;
  const isAdmin = req.user.role?.toLowerCase() === 'admin';

  try {
    const sale: any = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const status = isAdmin ? 'Approved' : 'Pending';
    const effectiveLocationId = location_id || sale.location_id;

    const transaction = db.transaction(() => {
      let totalRefund = 0;
      
      // Calculate original VAT and Discount percentages
      const vatPercent = sale.total_amount > 0 ? (sale.tax / sale.total_amount) : 0;
      const discountPercent = sale.total_amount > 0 ? (sale.discount / sale.total_amount) : 0;

      // Create return record
      const returnResult = db.prepare(`
        INSERT INTO sale_returns (sale_id, user_id, refund_amount, refund_method, reason, status, approved_by, location_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sale_id, user_id, 0, refund_method, reason, status, status === 'Approved' ? user_id : null, effectiveLocationId); 

      const saleReturnId = returnResult.lastInsertRowid;

      for (const item of items) {
        const { product_id, quantity, price } = item;
        
        // Validate quantity against sold quantity minus already returned quantity
        const soldItem: any = db.prepare('SELECT quantity FROM sale_items WHERE sale_id = ? AND product_id = ?')
          .get(sale_id, product_id);
        
        const alreadyReturned: any = db.prepare(`
          SELECT SUM(sri.quantity) as total 
          FROM sale_return_items sri 
          JOIN sale_returns sr ON sri.sale_return_id = sr.id 
          WHERE sr.sale_id = ? AND sri.product_id = ? AND sr.status != 'Rejected' AND sr.id != ?
        `).get(sale_id, product_id, saleReturnId);

        const availableToReturn = (soldItem?.quantity || 0) - (alreadyReturned?.total || 0);
        
        if (!soldItem || availableToReturn < quantity) {
          throw new Error(`Invalid return quantity for product. Max available: ${availableToReturn}`);
        }

        const itemSubtotal = price * quantity;
        const itemDiscount = itemSubtotal * discountPercent;
        const itemVat = itemSubtotal * vatPercent;
        const itemRefund = itemSubtotal - itemDiscount + itemVat;

        totalRefund += itemRefund;

        // Record returned item
        db.prepare(`
          INSERT INTO sale_return_items (sale_return_id, product_id, quantity, price_at_return, discount_amount, vat_amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(saleReturnId, product_id, quantity, price, itemDiscount, itemVat);

        if (status === 'Approved') {
          // Increase stock at specific location
          if (effectiveLocationId) {
            const stockExists = db.prepare('SELECT id FROM product_stocks WHERE product_id = ? AND location_id = ?').get(product_id, effectiveLocationId);
            if (stockExists) {
              db.prepare('UPDATE product_stocks SET stock = stock + ? WHERE product_id = ? AND location_id = ?').run(quantity, product_id, effectiveLocationId);
            } else {
              db.prepare('INSERT INTO product_stocks (product_id, location_id, stock) VALUES (?, ?, ?)').run(product_id, effectiveLocationId, quantity);
            }
          }

          // Global stock update
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, product_id);

          // Log stock change
          db.prepare(`
            INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
            VALUES (?, ?, 'Return', ?, ?, ?)
          `).run(product_id, user_id, quantity, `Customer Return: Sale #${sale_id}`, effectiveLocationId);
        }
      }

      // Update final refund amount
      db.prepare('UPDATE sale_returns SET refund_amount = ? WHERE id = ?').run(totalRefund, saleReturnId);

      // Handle Store Credit if approved
      if (status === 'Approved' && refund_method === 'store_credit' && sale.customer_id) {
        db.prepare('UPDATE customers SET store_credit = store_credit + ? WHERE id = ?')
          .run(totalRefund, sale.customer_id);
      }
    });

    transaction();
    res.json({ 
      message: status === 'Approved' ? 'Return processed successfully' : 'Return submitted for admin approval',
      status 
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const approveSaleReturn = (req: any, res: any) => {
  const { id } = req.params;
  const admin_id = req.user.id;

  try {
    const saleReturn: any = db.prepare('SELECT * FROM sale_returns WHERE id = ?').get(id);
    if (!saleReturn) return res.status(404).json({ message: 'Return record not found' });
    if (saleReturn.status !== 'Pending') return res.status(400).json({ message: `Return already ${saleReturn.status.toLowerCase()}` });

    const sale: any = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleReturn.sale_id);
    if (!sale) return res.status(404).json({ message: 'Linked sale record not found' });

    const items = db.prepare('SELECT * FROM sale_return_items WHERE sale_return_id = ?').all(id) as any[];

    const transaction = db.transaction(() => {
      for (const item of items) {
        // Increase global stock
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);

        // Increase location stock
        if (saleReturn.location_id) {
          const stockExists = db.prepare('SELECT id FROM product_stocks WHERE product_id = ? AND location_id = ?').get(item.product_id, saleReturn.location_id);
          if (stockExists) {
            db.prepare('UPDATE product_stocks SET stock = stock + ? WHERE product_id = ? AND location_id = ?').run(item.quantity, item.product_id, saleReturn.location_id);
          } else {
            db.prepare('INSERT INTO product_stocks (product_id, location_id, stock) VALUES (?, ?, ?)').run(item.product_id, saleReturn.location_id, item.quantity);
          }
        }

        // Log stock change
        db.prepare(`
          INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(item.product_id, admin_id, 'Return', item.quantity, `Approved Return #${id} (Sale #${saleReturn.sale_id})`, saleReturn.location_id);
      }

      // Update status
      const result = db.prepare('UPDATE sale_returns SET status = "Approved", approved_by = ? WHERE id = ? AND status = "Pending"')
        .run(admin_id, id);

      if (result.changes === 0) {
        throw new Error('Failed to update return status - it may have been processed by another admin');
      }

      // Store credit
      if (saleReturn.refund_method === 'store_credit' && sale.customer_id) {
        db.prepare('UPDATE customers SET store_credit = store_credit + ? WHERE id = ?')
          .run(saleReturn.refund_amount, sale.customer_id);
      }
    });

    transaction();
    res.json({ message: 'Return approved successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const rejectSaleReturn = (req: any, res: any) => {
  const { id } = req.params;
  const admin_id = req.user.id;

  try {
    const result = db.prepare('UPDATE sale_returns SET status = "Rejected", approved_by = ? WHERE id = ? AND status = "Pending"')
      .run(admin_id, id);
    
    if (result.changes === 0) {
      const saleReturn: any = db.prepare('SELECT status FROM sale_returns WHERE id = ?').get(id);
      if (!saleReturn) return res.status(404).json({ message: 'Return record not found' });
      return res.status(400).json({ message: `Return already ${saleReturn.status.toLowerCase()}` });
    }

    res.json({ message: 'Return rejected successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// --- SUPPLIER RETURNS ---

export const getSupplierReturns = (req: any, res: any) => {
  try {
    const returns = db.prepare(`
      SELECT sr.*, p.name as product_name, u.name as staff_name, sup.name as supplier_name, l.name as location_name
      FROM supplier_returns sr
      JOIN products p ON sr.product_id = p.id
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN suppliers sup ON sr.supplier_id = sup.id
      LEFT JOIN locations l ON sr.location_id = l.id
      ORDER BY sr.created_at DESC
    `).all();
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplierReturn = (req: any, res: any) => {
  const { product_id, quantity, supplier_id, refund_amount, refund_method, reason, location_id } = req.body;
  const user_id = req.user.id;

  try {
    const product: any = db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const effectiveLocationId = location_id || (db.prepare('SELECT id FROM locations LIMIT 1').get() as any)?.id;
    
    // Check location stock
    const locStock: any = db.prepare('SELECT stock FROM product_stocks WHERE product_id = ? AND location_id = ?').get(product_id, effectiveLocationId);
    if (!locStock || locStock.stock < quantity) {
      return res.status(400).json({ message: `Insufficient stock at this location. Available: ${locStock?.stock || 0}` });
    }

    const transaction = db.transaction(() => {
      // Create supplier return record
      db.prepare(`
        INSERT INTO supplier_returns (product_id, supplier_id, user_id, location_id, quantity, refund_amount, refund_method, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved')
      `).run(product_id, supplier_id, user_id, effectiveLocationId, quantity, refund_amount, refund_method || 'cash', reason);

      // Decrease location stock
      db.prepare('UPDATE product_stocks SET stock = stock - ? WHERE product_id = ? AND location_id = ?')
        .run(quantity, product_id, effectiveLocationId);

      // Decrease global stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

      // Handle supplier balance adjustment if refund_method is 'adjustment'
      if (refund_method === 'adjustment' && supplier_id) {
        db.prepare('UPDATE suppliers SET balance = balance - ? WHERE id = ?').run(refund_amount, supplier_id);
      }

      // Log stock change
      db.prepare(`
        INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, location_id)
        VALUES (?, ?, 'out', ?, ?, ?)
      `).run(product_id, user_id, quantity, `Supplier Return. Reason: ${reason || 'N/A'}`, effectiveLocationId);
    });

    transaction();
    res.json({ message: 'Supplier return recorded and stock updated' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
