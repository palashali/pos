import db from '../db';
import bcrypt from 'bcryptjs';

export const getWorkers = (req: any, res: any) => {
  const workers = db.prepare('SELECT id, name, email, role, image_url, created_at FROM users ORDER BY created_at DESC').all();
  res.json(workers);
};

export const createWorker = async (req: any, res: any) => {
  const { name, email, password, role, image_url } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password, role, image_url) VALUES (?, ?, ?, ?, ?)').run(
      name, email, hashedPassword, role || 'staff', image_url
    );
    res.json({ id: result.lastInsertRowid, message: 'Worker created successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateWorker = async (req: any, res: any) => {
  const { id } = req.params;
  const { name, email, password, role, image_url } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET name = ?, email = ?, password = ?, role = ?, image_url = ? WHERE id = ?').run(
        name, email, hashedPassword, role, image_url, id
      );
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, role = ?, image_url = ? WHERE id = ?').run(
        name, email, role, image_url, id
      );
    }
    res.json({ message: 'Worker updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProfile = async (req: any, res: any) => {
  const id = req.user.id;
  const { name, email, password, image_url } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET name = ?, email = ?, password = ?, image_url = ? WHERE id = ?').run(
        name, email, hashedPassword, image_url, id
      );
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, image_url = ? WHERE id = ?').run(
        name, email, image_url, id
      );
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteWorker = (req: any, res: any) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete yourself' });
  }
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Worker deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
