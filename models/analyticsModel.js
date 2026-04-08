const { getDb } = require('../config/db');

async function getDashboardMetrics() {
    const db = await getDb();
    
    const revenueRow = await db.get('SELECT SUM(total_price) as totalRevenue FROM orders');
    const ordersRow = await db.get('SELECT COUNT(*) as totalOrders FROM orders');
    
    const topProducts = await db.all(`
        SELECT p.name, SUM(o.total_price) as revenue, SUM(o.quantity) as quantity_sold
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
    `);

    const salesOverTime = await db.all(`
        SELECT date, SUM(total_price) as daily_revenue
        FROM orders
        GROUP BY date
        ORDER BY date ASC
    `);

    const categoryDistribution = await db.all(`
        SELECT p.category, COUNT(o.id) as order_count, SUM(o.total_price) as category_revenue
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY p.category
    `);
    
    const lowPerformingProducts = await db.all(`
        SELECT p.name, SUM(o.total_price) as revenue
        FROM orders o
        JOIN products p ON o.product_id = p.id
        GROUP BY p.id
        ORDER BY revenue ASC
        LIMIT 3
    `);

    return {
        totalRevenue: revenueRow.totalRevenue || 0,
        totalOrders: ordersRow.totalOrders || 0,
        topProducts,
        salesOverTime,
        categoryDistribution,
        lowPerformingProducts
    };
}

async function getOrders() {
    const db = await getDb();
    return await db.all(`
        SELECT o.id, u.name as customer_name, p.name as product_name, o.quantity, o.total_price, o.date
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN products p ON o.product_id = p.id
        ORDER BY o.date DESC
        LIMIT 50
    `);
}

async function getProducts() {
    const db = await getDb();
    return await db.all('SELECT * FROM products ORDER BY category ASC');
}

async function getCustomers() {
    const db = await getDb();
    return await db.all(`
        SELECT u.id, u.name, u.email, COUNT(o.id) as total_orders, SUM(o.total_price) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id
        ORDER BY total_spent DESC
    `);
}

/**
 * Compute analytics from scraped eCommerce product data.
 * Used by the AI insight engine to generate data-driven recommendations.
 */
async function getScrapedMetrics() {
    const db = await getDb();

    const count = await db.get('SELECT COUNT(*) as total FROM scraped_products');
    if (!count || count.total === 0) return null;

    const avgPrice = await db.get('SELECT AVG(price) as avg_price FROM scraped_products');
    const priceRange = await db.get('SELECT MIN(price) as min_price, MAX(price) as max_price FROM scraped_products');

    const categoryBreakdown = await db.all(`
        SELECT category, COUNT(*) as product_count, AVG(price) as avg_price, AVG(rating) as avg_rating
        FROM scraped_products
        GROUP BY category
        ORDER BY product_count DESC
    `);

    const topRated = await db.all(`
        SELECT name, price, category, rating, source
        FROM scraped_products
        ORDER BY rating DESC
        LIMIT 5
    `);

    const lowStock = await db.all(`
        SELECT name, price, category, stock, source
        FROM scraped_products
        WHERE stock > 0
        ORDER BY stock ASC
        LIMIT 5
    `);

    const sources = await db.all(`
        SELECT source, COUNT(*) as count, MAX(scraped_at) as last_scraped
        FROM scraped_products
        GROUP BY source
    `);

    return {
        totalProducts: count.total,
        avgPrice: avgPrice.avg_price || 0,
        minPrice: priceRange.min_price || 0,
        maxPrice: priceRange.max_price || 0,
        categoryBreakdown,
        topRated,
        lowStock,
        sources
    };
}

module.exports = {
    getDashboardMetrics,
    getOrders,
    getProducts,
    getCustomers,
    getScrapedMetrics
};
