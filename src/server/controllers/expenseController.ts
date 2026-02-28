import db from '../db';

export const getExpenses = (req: any, res: any) => {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all();
  res.json(expenses);
};

export const createExpense = (req: any, res: any) => {
  const { category, amount, description, date, month } = req.body;
  try {
    const result = db.prepare('INSERT INTO expenses (category, amount, description, date, month) VALUES (?, ?, ?, ?, ?)').run(
      category, amount, description, date || new Date().toISOString().split('T')[0], month || null
    );
    res.json({ id: result.lastInsertRowid, message: 'Expense recorded successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExpense = (req: any, res: any) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
