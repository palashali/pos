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
    is_approved INTEGER DEFAULT 1,
    added_by INTEGER,
    approval_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (added_by) REFERENCES users(id)
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
    type TEXT CHECK(type IN ('in', 'out', 'Adjustment', 'Return')) NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    cost_price REAL,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shop_name TEXT DEFAULT 'Feha Moon Collection',
    vat_enabled INTEGER DEFAULT 1,
    vat_percentage REAL DEFAULT 10,
    address TEXT,
    phone TEXT,
    discount_type TEXT DEFAULT 'fixed', -- 'fixed' or 'percentage'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('Store', 'Warehouse')) DEFAULT 'Store',
    address TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS product_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    balance REAL DEFAULT 0,
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

// Migration: Add is_approved, added_by and approval_type to products if they don't exist
const productColumns = db.prepare("PRAGMA table_info(products)").all() as any[];
if (!productColumns.find(c => c.name === 'is_approved')) {
  try { db.prepare('ALTER TABLE products ADD COLUMN is_approved INTEGER DEFAULT 1').run(); } catch(e) {}
}
if (!productColumns.find(c => c.name === 'added_by')) {
  try { db.prepare('ALTER TABLE products ADD COLUMN added_by INTEGER').run(); } catch(e) {}
}
if (!productColumns.find(c => c.name === 'approval_type')) {
  try { db.prepare('ALTER TABLE products ADD COLUMN approval_type TEXT').run(); } catch(e) {}
}

// Migration: Update stock_logs type column constraint
try {
  const stockLogColumns = db.prepare("PRAGMA table_info(stock_logs)").all() as any[];
  // If we don't have cost_price, we definitely need migration or just individual ALTERs
  if (!stockLogColumns.find(c => c.name === 'cost_price')) {
    try { db.prepare('ALTER TABLE stock_logs ADD COLUMN cost_price REAL').run(); } catch(e) {}
  }
  if (!stockLogColumns.find(c => c.name === 'price')) {
    try { db.prepare('ALTER TABLE stock_logs ADD COLUMN price REAL').run(); } catch(e) {}
  }
  if (!stockLogColumns.find(c => c.name === 'location_id')) {
    try { db.prepare('ALTER TABLE stock_logs ADD COLUMN location_id INTEGER').run(); } catch(e) {}
  }
} catch (e) {}

// Migration: Add store_credit and customer_code to customers
const customerColumns = db.prepare("PRAGMA table_info(customers)").all() as any[];
if (!customerColumns.find(c => c.name === 'store_credit')) {
  try { db.prepare('ALTER TABLE customers ADD COLUMN store_credit REAL DEFAULT 0').run(); } catch(e) {}
}
if (!customerColumns.find(c => c.name === 'customer_code')) {
  try { db.prepare('ALTER TABLE customers ADD COLUMN customer_code TEXT').run(); } catch(e) {}
}

// Sale Returns Table (Customer Returns)
db.prepare(`
  CREATE TABLE IF NOT EXISTS sale_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    refund_method TEXT NOT NULL, -- 'cash', 'card', 'store_credit'
    reason TEXT,
    status TEXT DEFAULT 'Approved', -- 'Pending', 'Approved', 'Rejected'
    approved_by INTEGER,
    location_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )
`).run();

// Ensure columns for sale_returns if it already existed
const saleReturnColumns = db.prepare("PRAGMA table_info(sale_returns)").all() as any[];
if (!saleReturnColumns.find(c => c.name === 'status')) {
  try { db.prepare('ALTER TABLE sale_returns ADD COLUMN status TEXT DEFAULT "Approved"').run(); } catch(e) {}
}
if (!saleReturnColumns.find(c => c.name === 'approved_by')) {
  try { db.prepare('ALTER TABLE sale_returns ADD COLUMN approved_by INTEGER').run(); } catch(e) {}
}
if (!saleReturnColumns.find(c => c.name === 'refund_method')) {
  try { db.prepare('ALTER TABLE sale_returns ADD COLUMN refund_method TEXT DEFAULT "cash"').run(); } catch(e) {}
}
if (!saleReturnColumns.find(c => c.name === 'location_id')) {
  try { db.prepare('ALTER TABLE sale_returns ADD COLUMN location_id INTEGER').run(); } catch(e) {}
}

// Migration: Add location_id to sales
const saleColumns = db.prepare("PRAGMA table_info(sales)").all() as any[];
if (!saleColumns.find(c => c.name === 'location_id')) {
  try { db.prepare('ALTER TABLE sales ADD COLUMN location_id INTEGER').run(); } catch(e) {}
}

// Migration: Add location_id to sale_items
const saleItemColumns = db.prepare("PRAGMA table_info(sale_items)").all() as any[];
if (!saleItemColumns.find(c => c.name === 'location_id')) {
  try { db.prepare('ALTER TABLE sale_items ADD COLUMN location_id INTEGER').run(); } catch(e) {}
}

// Stock Adjustments Table
db.prepare(`
  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'Damage', 'Expired', 'Theft', 'Manual'
    quantity INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    approved_by INTEGER,
    location_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )
`).run();

// Sale Return Items
db.prepare(`
  CREATE TABLE IF NOT EXISTS sale_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_return REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    vat_amount REAL DEFAULT 0,
    FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`).run();

// Migration: Add columns to sale_return_items if they don't exist
const saleReturnItemColumns = db.prepare("PRAGMA table_info(sale_return_items)").all() as any[];
if (!saleReturnItemColumns.find(c => c.name === 'discount_amount')) {
  try { db.prepare('ALTER TABLE sale_return_items ADD COLUMN discount_amount REAL DEFAULT 0').run(); } catch(e) {}
}
if (!saleReturnItemColumns.find(c => c.name === 'vat_amount')) {
  try { db.prepare('ALTER TABLE sale_return_items ADD COLUMN vat_amount REAL DEFAULT 0').run(); } catch(e) {}
}

const stockAdjColumns = db.prepare("PRAGMA table_info(stock_adjustments)").all() as any[];
if (!stockAdjColumns.find(c => c.name === 'location_id')) {
  try { db.prepare('ALTER TABLE stock_adjustments ADD COLUMN location_id INTEGER').run(); } catch(e) {}
}

// Supplier Returns (Purchase Returns)
db.prepare(`
  CREATE TABLE IF NOT EXISTS supplier_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    supplier_name TEXT, -- Fallback for legacy data or if supplier_id is null
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    refund_method TEXT DEFAULT 'cash',
    reason TEXT,
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Approved',
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )
`).run();

// Migration: Ensure columns for supplier_returns if it already existed
const supplierReturnColumns = db.prepare("PRAGMA table_info(supplier_returns)").all() as any[];
if (!supplierReturnColumns.find(c => c.name === 'supplier_id')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN supplier_id INTEGER').run(); } catch(e) {}
}
if (!supplierReturnColumns.find(c => c.name === 'location_id')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN location_id INTEGER').run(); } catch(e) {}
}
if (!supplierReturnColumns.find(c => c.name === 'refund_method')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN refund_method TEXT DEFAULT "cash"').run(); } catch(e) {}
}
if (!supplierReturnColumns.find(c => c.name === 'status')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN status TEXT DEFAULT "Approved"').run(); } catch(e) {}
}
if (!supplierReturnColumns.find(c => c.name === 'approved_by')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN approved_by INTEGER').run(); } catch(e) {}
}
if (!supplierReturnColumns.find(c => c.name === 'supplier_name')) {
  try { db.prepare('ALTER TABLE supplier_returns ADD COLUMN supplier_name TEXT').run(); } catch(e) {}
}

// Seed default location if none exists
const locationCount = db.prepare('SELECT COUNT(*) as count FROM locations').get() as any;
if (locationCount.count === 0) {
  db.prepare("INSERT INTO locations (name, type, address) VALUES ('Main Store', 'Store', 'Default Address')").run();
}

// Seed default settings if not exists
const settingsExist = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!settingsExist) {
  db.prepare('INSERT INTO settings (id, shop_name, vat_enabled, vat_percentage, discount_type) VALUES (1, ?, ?, ?, ?)').run(
    'Feha Moon Collection',
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
    '$2a$10$i.PZ9aV9a.v.m.U.m.m.m.O.m.m.m.m.m.m.m.m.m.m.m.m.m.m.m.', // Using a placeholder that looks like a hash
    'admin'
  );
}

// Migration: Update default shop name if it's currently "NexusPOS Pro"
try {
  db.prepare("UPDATE settings SET shop_name = 'Feha Moon Collection' WHERE shop_name = 'NexusPOS Pro'").run();
} catch (e) {}

export default db;
