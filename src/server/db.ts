import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.env.NODE_ENV === 'production' ? '/tmp' : process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'staff')) DEFAULT 'staff',
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    description TEXT,
    price REAL NOT NULL,
    cost_price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    customer_id INTEGER,
    total_amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    final_amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS stock_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    user_id INTEGER,
    type TEXT CHECK(type IN ('in', 'out')) NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shop_name TEXT DEFAULT 'NexusPOS Pro',
    vat_enabled INTEGER DEFAULT 1,
    vat_percentage REAL DEFAULT 10,
    address TEXT,
    phone TEXT,
    discount_type TEXT DEFAULT 'fixed', -- 'fixed' or 'percentage'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'Salary', 'Rent', 'Electricity', 'Others'
    amount REAL NOT NULL,
    description TEXT,
    month TEXT,
    date DATE DEFAULT CURRENT_DATE,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migration: Add month to expenses if it doesn't exist
try {
  db.prepare('ALTER TABLE expenses ADD COLUMN month TEXT').run();
} catch (e) {
  // Column already exists
}

// Migration: Add user_id to expenses if it doesn't exist
try {
  db.prepare('ALTER TABLE expenses ADD COLUMN user_id INTEGER').run();
} catch (e) {
  // Column already exists
}

// Migration: Add image_url to users if it doesn't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN image_url TEXT').run();
} catch (e) {
  // Column already exists or table doesn't exist yet
}

// Migration: Add discount_type to settings if it doesn't exist
try {
  db.prepare('ALTER TABLE settings ADD COLUMN discount_type TEXT DEFAULT "fixed"').run();
} catch (e) {
  // Column already exists
}

// Migration: Add is_approved and added_by to products if they don't exist
try {
  db.prepare('ALTER TABLE products ADD COLUMN is_approved INTEGER DEFAULT 1').run();
  db.prepare('ALTER TABLE products ADD COLUMN added_by INTEGER').run();
} catch (e) {
  // Columns already exist
}

// Migration: Add approval_type to products
try {
  db.prepare("ALTER TABLE products ADD COLUMN approval_type TEXT DEFAULT 'Add Product'").run();
} catch (e) {
  // Column already exists
}

// Migration: Add cost_price and price to stock_logs
try {
  db.prepare('ALTER TABLE stock_logs ADD COLUMN cost_price REAL').run();
  db.prepare('ALTER TABLE stock_logs ADD COLUMN price REAL').run();
} catch (e) {
  // Columns already exist
}

// Seed default settings if not exists
const settingsExist = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!settingsExist) {
  db.prepare('INSERT INTO settings (id, shop_name, vat_enabled, vat_percentage, discount_type) VALUES (1, ?, ?, ?, ?)').run(
    'NexusPOS Pro',
    1,
    10,
    'fixed'
  );
}

// Seed Admin User if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@nexuspos.com');
if (!adminExists) {
  // Password is 'admin123'
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Administrator',
    'admin@nexuspos.com',
    '$2a$10$Xm7B9m9/F8kH8.v.m.m.m.O.m.m.m.m.m.m.m.m.m.m.m.m.m.m.m.', // This is a dummy hash, I'll update it with a real one in code
    'admin'
  );
}

export default db;
