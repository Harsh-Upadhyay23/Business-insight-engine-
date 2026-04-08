const scraperService = require('../services/scraperService');
const { getDb } = require('../config/db');

/**
 * Scrape products from a selected eCommerce source.
 * Clears old scraped data for that source, then inserts fresh data.
 * 
 * Route: GET /api/scrape/:source
 * Sources: books | fakestoreapi | dummyjson
 */
async function scrapeSource(req, res) {
    const source = req.params.source;
    const scraperMap = {
        'books': scraperService.scrapeBooks,
        'fakestoreapi': scraperService.scrapeFakeStore,
        'dummyjson': scraperService.scrapeDummyJSON
    };

    const scraperFn = scraperMap[source];
    if (!scraperFn) {
        return res.status(400).json({ error: `Unknown source: ${source}. Use: books, fakestoreapi, or dummyjson.` });
    }

    try {
        // 1. Scrape products from the selected source
        const products = await scraperFn();

        // 2. Store in database (clear old data for this source first)
        const db = await getDb();
        await db.run('DELETE FROM scraped_products WHERE source = ?', [
            source === 'books' ? 'books.toscrape.com' :
            source === 'fakestoreapi' ? 'fakestoreapi.com' : 'dummyjson.com'
        ]);

        const stmt = await db.prepare(
            'INSERT INTO scraped_products (name, price, category, rating, stock, source, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        const now = new Date().toISOString();
        for (const p of products) {
            await stmt.run(p.name, p.price, p.category, p.rating, p.stock, p.source, now);
        }
        await stmt.finalize();

        // 3. Return the scraped data
        res.json({
            message: `Successfully scraped ${products.length} products from ${source}.`,
            count: products.length,
            products
        });

    } catch (error) {
        console.error(`Error scraping ${source}:`, error.message);
        res.status(500).json({ error: `Failed to scrape from ${source}: ${error.message}` });
    }
}

/**
 * Get all previously scraped products from the database.
 * Route: GET /api/scraped-products
 */
async function getScrapedProducts(req, res) {
    try {
        const db = await getDb();
        const products = await db.all('SELECT * FROM scraped_products ORDER BY scraped_at DESC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch scraped products.' });
    }
}

module.exports = {
    scrapeSource,
    getScrapedProducts
};
