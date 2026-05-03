import db from '../db';

export const getExpenses = (req: any, res: any) => {
  let query = 'SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id ';
  const params: any[] = [];
  
  if (req.user && req.user.role === 'staff') {
    query += ' WHERE e.user_id = ? ';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY e.date DESC, e.created_at DESC';
  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
};

export const createExpense = (req: any, res: any) => {
  const { category, amount, description, date, month } = req.body;
  const user_id = req.user ? req.user.id : null;
  try {
    const result = db.prepare('INSERT INTO expenses (category, amount, description, date, month, user_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      category, amount, description, date || new Date().toISOString().split('T')[0], month || null, user_id
    );
    res.json({ id: result.lastInsertRowid, message: 'Expense recorded successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExpense = (req: any, res: any) => {
  const { id } = req.params;
  try {
    if (req.user && req.user.role === 'staff') {
      const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;
      if (!expense || expense.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
