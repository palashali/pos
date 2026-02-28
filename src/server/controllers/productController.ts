import db from '../db';

export const getProducts = (req: any, res: any) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `).all();
  res.json(products);
};

export const getProduct = (req: any, res: any) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

export const createProduct = (req: any, res: any) => {
  const { name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = db.prepare(`
      INSERT INTO products (name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url);

    // Log initial stock
    if (stock > 0) {
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(
        result.lastInsertRowid,
        req.user.id,
        'in',
        stock,
        'Initial stock'
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
      db.prepare('INSERT INTO stock_logs (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)').run(
        req.params.id,
        req.user.id,
        diff > 0 ? 'in' : 'out',
        Math.abs(diff),
        'Manual adjustment'
      );
    }

    res.json({ message: 'Product updated successfully' });
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
