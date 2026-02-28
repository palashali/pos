import db from '../db';

export const getSettings = (req: any, res: any) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
};

export const updateSettings = (req: any, res: any) => {
  const { shop_name, vat_enabled, vat_percentage, address, phone, discount_type } = req.body;
  try {
    db.prepare(`
      UPDATE settings 
      SET shop_name = ?, vat_enabled = ?, vat_percentage = ?, address = ?, phone = ?, discount_type = ?
      WHERE id = 1
    `).run(shop_name, vat_enabled ? 1 : 0, vat_percentage, address, phone, discount_type);
    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
