import db from '../db';

export const getCategories = (req: any, res: any) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json(categories);
};

export const createCategory = (req: any, res: any) => {
  const { name, description } = req.body;
  try {
    const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newCategory);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCategory = (req: any, res: any) => {
  const { name, description } = req.body;
  try {
    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description, req.params.id);
    res.json({ message: 'Category updated' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategory = (req: any, res: any) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
