const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const insightController = require('../controllers/insightController');
const scraperController = require('../controllers/scraperController');

// ✅ Middleware (NEW)
const authMiddleware = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Dashboard & data endpoints (protected)
router.get('/dashboard', authMiddleware, dashboardController.getDashboardData);
router.get('/orders', authMiddleware, dashboardController.getOrdersData);
router.get('/products', authMiddleware, dashboardController.getProductsData);
router.get('/customers', authMiddleware, dashboardController.getCustomersData);

// ✅ Search & Filter (NEW)
router.get('/products/search', authMiddleware, dashboardController.searchProducts);

// AI Insights
router.get('/insights/generate', rateLimiter, insightController.generateInsights);

// ✅ AI Summary Download (NEW)
router.get('/insights/download', insightController.downloadInsightsReport);

// Web Scraping
router.get('/scrape/:source', rateLimiter, scraperController.scrapeSource);

// ✅ Schedule scraping (NEW)
router.post('/scrape/schedule', scraperController.scheduleScraping);

router.get('/scraped-products', scraperController.getScrapedProducts);

// ✅ Delete scraped data (NEW)
router.delete('/scraped-products/:id', scraperController.deleteScrapedProduct);

module.exports = router;
