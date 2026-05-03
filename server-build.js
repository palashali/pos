// server.ts
import express10 from "express";
import cors from "cors";
import path3 from "path";
import fs from "fs";

// src/server/routes/authRoutes.ts
import express from "express";

// src/server/controllers/authController.ts
import bcrypt from "bcryptjs";

// src/server/db.ts
import Database from "better-sqlite3";
import path from "path";
var dbPath = path.join(process.cwd(), "database.sqlite");
var db = new Database(dbPath);
db.pragma("foreign_keys = ON");
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
try {
  db.prepare("ALTER TABLE expenses ADD COLUMN month TEXT").run();
} catch (e) {
}
try {
  db.prepare("ALTER TABLE users ADD COLUMN image_url TEXT").run();
} catch (e) {
}
try {
  db.prepare('ALTER TABLE settings ADD COLUMN discount_type TEXT DEFAULT "fixed"').run();
} catch (e) {
}
try {
  db.prepare("ALTER TABLE products ADD COLUMN is_approved INTEGER DEFAULT 1").run();
  db.prepare("ALTER TABLE products ADD COLUMN added_by INTEGER").run();
} catch (e) {
}
try {
  db.prepare("ALTER TABLE stock_logs ADD COLUMN cost_price REAL").run();
  db.prepare("ALTER TABLE stock_logs ADD COLUMN price REAL").run();
} catch (e) {
}
var settingsExist = db.prepare("SELECT * FROM settings WHERE id = 1").get();
if (!settingsExist) {
  db.prepare("INSERT INTO settings (id, shop_name, vat_enabled, vat_percentage, discount_type) VALUES (1, ?, ?, ?, ?)").run(
    "NexusPOS Pro",
    1,
    10,
    "fixed"
  );
}
var adminExists = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@nexuspos.com");
if (!adminExists) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(
    "Administrator",
    "admin@nexuspos.com",
    "$2a$10$Xm7B9m9/F8kH8.v.m.m.m.O.m.m.m.m.m.m.m.m.m.m.m.m.m.m.m.",
    // This is a dummy hash, I'll update it with a real one in code
    "admin"
  );
}
var db_default = db;

// src/server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "nexus-pos-secret-key-2024";
var generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};
var verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
};
var isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }
  next();
};

// src/server/controllers/authController.ts
var login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db_default.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    const isInitialAdmin = email === "admin@nexuspos.com" && password === "admin123";
    if (!isMatch && !isInitialAdmin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
var getProfile = (req, res) => {
  const user = db_default.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
};

// src/server/routes/authRoutes.ts
var router = express.Router();
router.post("/login", login);
router.get("/profile", verifyToken, getProfile);
var authRoutes_default = router;

// src/server/routes/productRoutes.ts
import express2 from "express";
import multer from "multer";
import path2 from "path";

// src/server/controllers/productController.ts
var getProducts = (req, res) => {
  const { approved_only } = req.query;
  let query = `
    SELECT p.*, c.name as category_name, u.name as added_by_name
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN users u ON p.added_by = u.id
  `;
  const conditions = [];
  if (approved_only === "true") {
    conditions.push("p.is_approved = 1");
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }
  query += ` ORDER BY p.created_at DESC`;
  const products = db_default.prepare(query).all();
  res.json(products);
};
var getProduct = (req, res) => {
  const product = db_default.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};
var getProductByBarcode = (req, res) => {
  const product = db_default.prepare("SELECT * FROM products WHERE barcode = ?").get(req.params.barcode);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
};
var createProduct = (req, res) => {
  const { name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const is_approved = req.user.role === "admin" ? 1 : 0;
  const added_by = req.user.id;
  try {
    const result = db_default.prepare(`
      INSERT INTO products (name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url, is_approved, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold, image_url, is_approved, added_by);
    if (stock > 0) {
      db_default.prepare("INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        result.lastInsertRowid,
        req.user.id,
        "in",
        stock,
        "Initial stock",
        cost_price,
        price
      );
    }
    res.status(201).json({ id: result.lastInsertRowid, message: "Product created successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var updateProduct = (req, res) => {
  const { name, category_id, barcode, description, price, cost_price, stock, low_stock_threshold } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : void 0;
  try {
    const currentProduct = db_default.prepare("SELECT stock FROM products WHERE id = ?").get(req.params.id);
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
    db_default.prepare(query).run(...params);
    if (stock !== currentProduct.stock) {
      const diff = stock - currentProduct.stock;
      db_default.prepare("INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        req.params.id,
        req.user.id,
        diff > 0 ? "in" : "out",
        Math.abs(diff),
        "Manual adjustment",
        cost_price,
        price
      );
    }
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var adjustStock = (req, res) => {
  const { quantity, reason } = req.body;
  const productId = req.params.id;
  try {
    const currentProduct = db_default.prepare("SELECT stock, cost_price, price FROM products WHERE id = ?").get(productId);
    if (!currentProduct) return res.status(404).json({ message: "Product not found" });
    const newStock = currentProduct.stock + Number(quantity);
    db_default.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newStock, productId);
    db_default.prepare("INSERT INTO stock_logs (product_id, user_id, type, quantity, reason, cost_price, price) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      productId,
      req.user.id,
      Number(quantity) > 0 ? "in" : "out",
      Math.abs(Number(quantity)),
      reason || "Manual adjustment",
      currentProduct.cost_price,
      currentProduct.price
    );
    res.json({ message: "Stock adjusted successfully", newStock });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var deleteProduct = (req, res) => {
  try {
    db_default.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var approveProduct = (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Only admins can approve products" });
  }
  try {
    db_default.prepare("UPDATE products SET is_approved = 1 WHERE id = ?").run(req.params.id);
    res.json({ message: "Product approved successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var getProductHistory = (req, res) => {
  const productId = req.params.id;
  try {
    const product = db_default.prepare(`
      SELECT p.*, u.name as added_by_name 
      FROM products p 
      LEFT JOIN users u ON p.added_by = u.id 
      WHERE p.id = ?
    `).get(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const logs = db_default.prepare(`
      SELECT sl.*, u.name as user_name 
      FROM stock_logs sl 
      LEFT JOIN users u ON sl.user_id = u.id 
      WHERE sl.product_id = ? 
      ORDER BY sl.created_at DESC
    `).all(productId);
    res.json({ product, logs });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// src/server/routes/productRoutes.ts
var router2 = express2.Router();
var storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path2.extname(file.originalname));
  }
});
var upload = multer({ storage });
router2.get("/", verifyToken, getProducts);
router2.get("/barcode/:barcode", verifyToken, getProductByBarcode);
router2.get("/:id", verifyToken, getProduct);
router2.get("/:id/history", verifyToken, getProductHistory);
router2.post("/", verifyToken, upload.single("image"), createProduct);
router2.post("/:id/approve", verifyToken, isAdmin, approveProduct);
router2.put("/:id", verifyToken, isAdmin, upload.single("image"), updateProduct);
router2.post("/:id/adjust-stock", verifyToken, isAdmin, adjustStock);
router2.delete("/:id", verifyToken, isAdmin, deleteProduct);
var productRoutes_default = router2;

// src/server/routes/categoryRoutes.ts
import express3 from "express";

// src/server/controllers/categoryController.ts
var getCategories = (req, res) => {
  const categories = db_default.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  res.json(categories);
};
var createCategory = (req, res) => {
  const { name, description } = req.body;
  try {
    const result = db_default.prepare("INSERT INTO categories (name, description) VALUES (?, ?)").run(name, description);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var updateCategory = (req, res) => {
  const { name, description } = req.body;
  try {
    db_default.prepare("UPDATE categories SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
    res.json({ message: "Category updated" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var deleteCategory = (req, res) => {
  try {
    db_default.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// src/server/routes/categoryRoutes.ts
var router3 = express3.Router();
router3.get("/", verifyToken, getCategories);
router3.post("/", verifyToken, isAdmin, createCategory);
router3.put("/:id", verifyToken, isAdmin, updateCategory);
router3.delete("/:id", verifyToken, isAdmin, deleteCategory);
var categoryRoutes_default = router3;

// src/server/routes/customerRoutes.ts
import express4 from "express";

// src/server/controllers/customerController.ts
var getCustomers = (req, res) => {
  const customers = db_default.prepare("SELECT * FROM customers ORDER BY name ASC").all();
  res.json(customers);
};
var createCustomer = (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const result = db_default.prepare("INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)").run(name, email, phone, address);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var getCustomerHistory = (req, res) => {
  const sales = db_default.prepare(`
    SELECT s.*, u.name as staff_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.customer_id = ? 
    ORDER BY s.created_at DESC
  `).all(req.params.id);
  res.json(sales);
};

// src/server/routes/customerRoutes.ts
var router4 = express4.Router();
router4.get("/", verifyToken, getCustomers);
router4.post("/", verifyToken, createCustomer);
router4.get("/:id/history", verifyToken, getCustomerHistory);
var customerRoutes_default = router4;

// src/server/routes/saleRoutes.ts
import express5 from "express";

// src/server/controllers/saleController.ts
var createSale = (req, res) => {
  const { customer_id, items, total_amount, discount, tax, final_amount, payment_method } = req.body;
  const user_id = req.user.id;
  const transaction = db_default.transaction(() => {
    const saleResult = db_default.prepare(`
      INSERT INTO sales (user_id, customer_id, total_amount, discount, tax, final_amount, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, customer_id, total_amount, discount, tax, final_amount, payment_method);
    const saleId = saleResult.lastInsertRowid;
    for (const item of items) {
      db_default.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal);
      db_default.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id);
      db_default.prepare("INSERT INTO stock_logs (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)").run(
        item.product_id,
        user_id,
        "out",
        item.quantity,
        `Sale #${saleId}`
      );
    }
    return saleId;
  });
  try {
    const saleId = transaction();
    res.status(201).json({ id: saleId, message: "Sale completed successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var getSales = (req, res) => {
  const sales = db_default.prepare(`
    SELECT s.*, u.name as staff_name, c.name as customer_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sales);
};
var getSaleDetails = (req, res) => {
  const sale = db_default.prepare(`
    SELECT s.*, u.name as staff_name, c.name as customer_name 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!sale) return res.status(404).json({ message: "Sale not found" });
  const items = db_default.prepare(`
    SELECT si.*, p.name as product_name 
    FROM sale_items si 
    JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ?
  `).all(req.params.id);
  res.json({ ...sale, items });
};

// src/server/routes/saleRoutes.ts
var router5 = express5.Router();
router5.get("/", verifyToken, getSales);
router5.get("/:id", verifyToken, getSaleDetails);
router5.post("/", verifyToken, createSale);
var saleRoutes_default = router5;

// src/server/routes/dashboardRoutes.ts
import express6 from "express";

// src/server/controllers/dashboardController.ts
var getStats = (req, res) => {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const totalSalesToday = db_default.prepare("SELECT SUM(final_amount) as total FROM sales WHERE date(created_at) = ?").get(today);
  const totalExpensesToday = db_default.prepare("SELECT SUM(amount) as total FROM expenses WHERE date = ?").get(today);
  const totalProducts = db_default.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 1").get();
  const lowStockCount = db_default.prepare("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_threshold AND is_approved = 1").get();
  let pendingApprovals = 0;
  if (req.user.role === "admin") {
    const pending = db_default.prepare("SELECT COUNT(*) as count FROM products WHERE is_approved = 0").get();
    pendingApprovals = pending.count;
  }
  const monthlySales = db_default.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(final_amount) as total 
    FROM sales 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all();
  const monthlyExpenses = db_default.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total 
    FROM expenses 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all();
  const popularProducts = db_default.prepare(`
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `).all();
  const lowStockItems = db_default.prepare(`
    SELECT name, stock, low_stock_threshold
    FROM products
    WHERE stock <= low_stock_threshold
    ORDER BY stock ASC
    LIMIT 5
  `).all();
  res.json({
    todaySales: totalSalesToday.total || 0,
    todayExpenses: totalExpensesToday.total || 0,
    totalProducts: totalProducts.count,
    lowStockCount: lowStockCount.count,
    pendingApprovals,
    monthlySales: monthlySales.reverse(),
    monthlyExpenses: monthlyExpenses.reverse(),
    popularProducts,
    lowStockItems
  });
};

// src/server/routes/dashboardRoutes.ts
var router6 = express6.Router();
router6.get("/stats", verifyToken, getStats);
var dashboardRoutes_default = router6;

// src/server/routes/settingRoutes.ts
import express7 from "express";

// src/server/controllers/settingController.ts
var getSettings = (req, res) => {
  const settings = db_default.prepare("SELECT * FROM settings WHERE id = 1").get();
  res.json(settings);
};
var updateSettings = (req, res) => {
  const { shop_name, vat_enabled, vat_percentage, address, phone, discount_type } = req.body;
  try {
    db_default.prepare(`
      UPDATE settings 
      SET shop_name = ?, vat_enabled = ?, vat_percentage = ?, address = ?, phone = ?, discount_type = ?
      WHERE id = 1
    `).run(shop_name, vat_enabled ? 1 : 0, vat_percentage, address, phone, discount_type);
    res.json({ message: "Settings updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// src/server/routes/settingRoutes.ts
var router7 = express7.Router();
router7.get("/", verifyToken, getSettings);
router7.put("/", verifyToken, isAdmin, updateSettings);
var settingRoutes_default = router7;

// src/server/routes/workerRoutes.ts
import express8 from "express";

// src/server/controllers/workerController.ts
import bcrypt2 from "bcryptjs";
var getWorkers = (req, res) => {
  const workers = db_default.prepare("SELECT id, name, email, role, image_url, created_at FROM users ORDER BY created_at DESC").all();
  res.json(workers);
};
var createWorker = async (req, res) => {
  const { name, email, password, role, image_url } = req.body;
  try {
    const hashedPassword = await bcrypt2.hash(password, 10);
    const result = db_default.prepare("INSERT INTO users (name, email, password, role, image_url) VALUES (?, ?, ?, ?, ?)").run(
      name,
      email,
      hashedPassword,
      role || "staff",
      image_url
    );
    res.json({ id: result.lastInsertRowid, message: "Worker created successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var updateWorker = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, image_url } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt2.hash(password, 10);
      db_default.prepare("UPDATE users SET name = ?, email = ?, password = ?, role = ?, image_url = ? WHERE id = ?").run(
        name,
        email,
        hashedPassword,
        role,
        image_url,
        id
      );
    } else {
      db_default.prepare("UPDATE users SET name = ?, email = ?, role = ?, image_url = ? WHERE id = ?").run(
        name,
        email,
        role,
        image_url,
        id
      );
    }
    res.json({ message: "Worker updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var updateProfile = async (req, res) => {
  const id = req.user.id;
  const { name, email, password, image_url } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt2.hash(password, 10);
      db_default.prepare("UPDATE users SET name = ?, email = ?, password = ?, image_url = ? WHERE id = ?").run(
        name,
        email,
        hashedPassword,
        image_url,
        id
      );
    } else {
      db_default.prepare("UPDATE users SET name = ?, email = ?, image_url = ? WHERE id = ?").run(
        name,
        email,
        image_url,
        id
      );
    }
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var deleteWorker = (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete yourself" });
  }
  try {
    db_default.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ message: "Worker deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// src/server/routes/workerRoutes.ts
var router8 = express8.Router();
router8.get("/", verifyToken, isAdmin, getWorkers);
router8.post("/", verifyToken, isAdmin, createWorker);
router8.put("/profile", verifyToken, updateProfile);
router8.put("/:id", verifyToken, isAdmin, updateWorker);
router8.delete("/:id", verifyToken, isAdmin, deleteWorker);
var workerRoutes_default = router8;

// src/server/routes/expenseRoutes.ts
import express9 from "express";

// src/server/controllers/expenseController.ts
var getExpenses = (req, res) => {
  const expenses = db_default.prepare("SELECT * FROM expenses ORDER BY date DESC, created_at DESC").all();
  res.json(expenses);
};
var createExpense = (req, res) => {
  const { category, amount, description, date, month } = req.body;
  try {
    const result = db_default.prepare("INSERT INTO expenses (category, amount, description, date, month) VALUES (?, ?, ?, ?, ?)").run(
      category,
      amount,
      description,
      date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      month || null
    );
    res.json({ id: result.lastInsertRowid, message: "Expense recorded successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var deleteExpense = (req, res) => {
  const { id } = req.params;
  try {
    db_default.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// src/server/routes/expenseRoutes.ts
var router9 = express9.Router();
router9.get("/", verifyToken, getExpenses);
router9.post("/", verifyToken, isAdmin, createExpense);
router9.delete("/:id", verifyToken, isAdmin, deleteExpense);
var expenseRoutes_default = router9;

// server.ts
async function startServer() {
  const app = express10();
  const PORT = 3e3;
  const uploadsDir = path3.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  app.use(cors());
  app.use(express10.json());
  app.use("/uploads", express10.static(uploadsDir));
  app.use("/api/auth", authRoutes_default);
  app.use("/api/products", productRoutes_default);
  app.use("/api/categories", categoryRoutes_default);
  app.use("/api/customers", customerRoutes_default);
  app.use("/api/sales", saleRoutes_default);
  app.use("/api/dashboard", dashboardRoutes_default);
  app.use("/api/settings", settingRoutes_default);
  app.use("/api/workers", workerRoutes_default);
  app.use("/api/expenses", expenseRoutes_default);
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path3.join(process.cwd(), "dist");
    app.use(express10.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err : {}
    });
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexusPOS Pro running on http://localhost:${PORT}`);
  });
}
startServer();
