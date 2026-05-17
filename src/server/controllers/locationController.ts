import db from "../db";

export const getLocations = (req: any, res: any) => {
  try {
    const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1').all();
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createLocation = (req: any, res: any) => {
  const { name, type, address } = req.body;
  try {
    const result = db.prepare('INSERT INTO locations (name, type, address) VALUES (?, ?, ?)').run(name, type, address);
    res.json({ id: result.lastInsertRowid, message: 'Location created successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProductStocks = (req: any, res: any) => {
  const { productId } = req.params;
  try {
    const stocks = db.prepare(`
      SELECT l.name as location_name, l.id as location_id, IFNULL(ps.stock, 0) as stock
      FROM locations l
      LEFT JOIN product_stocks ps ON ps.location_id = l.id AND ps.product_id = ?
      WHERE l.is_active = 1
    `).all(productId);
    res.json(stocks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
