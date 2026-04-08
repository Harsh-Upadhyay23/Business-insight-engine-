/**
 * Scraper Service
 * 
 * Contains scraping functions for each eCommerce data source.
 * All scrapers normalize data into a common format:
 * { name, price, category, rating, stock, source }
 * 
 * Sources:
 * 1. Books to Scrape (books.toscrape.com) — HTML scraping with Cheerio
 * 2. Fake Store API (fakestoreapi.com) — REST API
 * 3. DummyJSON (dummyjson.com) — REST API
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape books from books.toscrape.com
 * Demonstrates real HTML parsing with Cheerio (web scraping)
 */
async function scrapeBooks() {
    const products = [];
    const baseUrl = 'http://books.toscrape.com';

    // Scrape first 2 pages for a good dataset
    for (let page = 1; page <= 2; page++) {
        const url = page === 1
            ? `${baseUrl}/index.html`
            : `${baseUrl}/catalogue/page-${page}.html`;

        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // Each product is inside an <article class="product_pod">
        $('article.product_pod').each((_, el) => {
            const name = $(el).find('h3 a').attr('title');
            const priceText = $(el).find('.price_color').text();
            const price = parseFloat(priceText.replace('£', ''));

            // Star rating is stored as a CSS class (e.g., "star-rating Three")
            const ratingClass = $(el).find('.star-rating').attr('class');
            const ratingMap = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };
            const ratingWord = ratingClass ? ratingClass.split(' ')[1] : 'Three';
            const rating = ratingMap[ratingWord] || 3;

            // Category is derived from page context; use "Books" as default
            const category = 'Books';

            products.push({
                name,
                price,
                category,
                rating,
                stock: Math.floor(Math.random() * 50) + 1, // Simulated stock
                source: 'books.toscrape.com'
            });
        });
    }

    return products;
}

/**
 * Fetch products from Fake Store API
 * Returns real product data with categories, prices, and ratings
 */
async function scrapeFakeStore() {
    const { data } = await axios.get('https://fakestoreapi.com/products');

    return data.map(item => ({
        name: item.title,
        price: item.price,
        category: item.category,
        rating: item.rating?.rate || 0,
        stock: item.rating?.count || 0,
        source: 'fakestoreapi.com'
    }));
}

/**
 * Fetch products from DummyJSON API
 * Rich dataset with 194 products including brands, stock levels, and reviews
 */
async function scrapeDummyJSON() {
    const { data } = await axios.get('https://dummyjson.com/products?limit=50');

    return data.products.map(item => ({
        name: item.title,
        price: item.price,
        category: item.category,
        rating: item.rating || 0,
        stock: item.stock || 0,
        source: 'dummyjson.com'
    }));
}

module.exports = {
    scrapeBooks,
    scrapeFakeStore,
    scrapeDummyJSON
};
