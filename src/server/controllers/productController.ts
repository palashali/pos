import db from '../db';

export const getProducts = (req: any, res: any) => {
  const { approved_only } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, u.name as added_by_name
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.added_by = u.id
  `;
  
  const conditions = [];
  if (approved_only === 'true') {
    conditions.push('p.is_approved = 1');
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY p.created_at DESC`;

  const products = db.prepare(query).all();
  res.json(products);
};

export const getProduct = (req: any, res: any) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

export const getProductByBarcode = (req: any, res: any) => {
  const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

export const createProduct = (req: any, res: any) => {
  const { name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const is_approved = req.user.role === 'admin' ? 1 : 0;
  const added_by = req.user.id;

  try {
    const result = db.prepare(`
      INSERT INTO products (name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url, is_approved, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url, is_approved, added_by);

    // Log initial stock
    if (stock > 0) {
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        result.lastInsertRowid,
        req.user.id,
        'in',
        stock,
        'Initial stock',
        cost_price,
        price
      );
    }

    res.status(201).json({ id: result.lastInsertRowid, message: 'Product created successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = (req: any, res: any) => {
  const { name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const currentProduct: any = db.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id);
    
    let query = `
      UPDATE products 
      SET name = ?, category_id = ?, barcode = ?, description = ?, price = ?, cost_price = ?, stock = ?, low_stock_threshold = ?
    `;
    const params = [name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold];

    if (image_url) {
      query += `, image_url = ?`;
      params.push(image_url);
    }

    query += ` WHERE id = ?`;
    params.push(req.params.id);

    db.prepare(query).run(...params);

    // Log stock adjustment if changed
    if (stock !== currentProduct.stock) {
      const diff = stock - currentProduct.stock;
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        req.params.id,
        req.user.id,
        diff > 0 ? 'in' : 'out',
        Math.abs(diff),
        'Manual adjustment',
        cost_price,
        price
      );
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adjustStock = (req: any, res: any) => {
  const { quantity, reason } = req.body;
  const productId = req.params.id;

  try {
    const currentProduct: any = db.prepare('SELECT stock, cost_price, price FROM products WHERE id = ?').get(productId);
    if (!currentProduct) return res.status(404).json({ message: 'Product not found' });

    const newStock = currentProduct.stock + Number(quantity);
    
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(newStock, productId);

    db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      productId,
      req.user.id,
      Number(quantity) > 0 ? 'in' : 'out',
      Math.abs(Number(quantity)),
      reason || 'Manual adjustment',
      currentProduct.cost_price,
      currentProduct.price
    );

    res.json({ message: 'Stock adjusted successfully', newStock });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = (req: any, res: any) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const approveProduct = (req: any, res: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can approve products' });
  }

  try {
    db.prepare('UPDATE products SET is_approved = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product approved successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProductHistory = (req: any, res: any) => {
  const productId = req.params.id;
  try {
    const product = db.prepare(`
      SELECT p.*, u.name as added_by_name 
      FROM products p 
      LEFT JOIN users u ON p.added_by = u.id 
      WHERE p.id = ?
    `).get(productId);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const logs = db.prepare(`
      SELECT sl.*, u.name as user_name 
      FROM stock_logs sl 
      LEFT JOIN users u ON sl.user_id = u.id 
      WHERE sl.product_id = ? 
      ORDER BY sl.created_at DESC
    `).all(productId);

    res.json({ product, logs });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
