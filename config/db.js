const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let db;

async function initDb() {
    db = await open({
        filename: path.join(__dirname, '..', 'database.sqlite'),
        driver: sqlite3.Database
    });

    await createTables();
    await seedData();
    
    console.log('Database initialized successfully.');
    return db;
}

async function getDb() {
    if (!db) {
        await initDb();
    }
    return db;
}

async function createTables() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    `);

    // Table for storing scraped eCommerce product data
    await db.exec(`
        CREATE TABLE IF NOT EXISTS scraped_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            price REAL,
            category TEXT,
            rating REAL,
            stock INTEGER,
            source TEXT,
            scraped_at TEXT
        )
    `);
}

async function seedData() {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) return; // Already seeded

    console.log('Seeding database with dummy data...');

    const users = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
        { name: 'Alice Johnson', email: 'alice@example.com' },
        { name: 'Bob Brown', email: 'bob@example.com' },
        { name: 'Eve Davis', email: 'eve@example.com' }
    ];
    for (const user of users) {
        await db.run('INSERT INTO users (name, email) VALUES (?, ?)', [user.name, user.email]);
    }

    const products = [
        { name: 'Laptop Pro', category: 'Electronics', price: 1200.00 },
        { name: 'Wireless Mouse', category: 'Electronics', price: 25.00 },
        { name: 'Mechanical Keyboard', category: 'Electronics', price: 150.00 },
        { name: 'Ergonomic Chair', category: 'Furniture', price: 250.00 },
        { name: 'Standing Desk', category: 'Furniture', price: 450.00 },
        { name: 'Coffee Mug', category: 'Accessories', price: 15.00 },
        { name: 'USB-C Hub', category: 'Electronics', price: 45.00 },
        { name: 'Desk Lamp', category: 'Furniture', price: 35.00 }
    ];
    for (const prod of products) {
        await db.run('INSERT INTO products (name, category, price) VALUES (?, ?, ?)', [prod.name, prod.category, prod.price]);
    }

    for (let i = 0; i < 150; i++) {
        const userId = Math.floor(Math.random() * users.length) + 1;
        const productId = Math.floor(Math.random() * products.length) + 1;
        const quantity = Math.floor(Math.random() * 3) + 1;
        const priceRow = await db.get('SELECT price FROM products WHERE id = ?', [productId]);
        const totalPrice = priceRow.price * quantity;
        
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 60)); // Spread over 60 days
        const dateStr = dateObj.toISOString().split('T')[0];

        await db.run(
            'INSERT INTO orders (user_id, product_id, quantity, total_price, date) VALUES (?, ?, ?, ?, ?)',
            [userId, productId, quantity, totalPrice, dateStr]
        );
    }
}

module.exports = { initDb, getDb };
