const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const insightController = require('../controllers/insightController');
const scraperController = require('../controllers/scraperController');

// Dashboard & data endpoints
router.get('/dashboard', dashboardController.getDashboardData);
router.get('/orders', dashboardController.getOrdersData);
router.get('/products', dashboardController.getProductsData);
router.get('/customers', dashboardController.getCustomersData);

// AI Insights
router.get('/insights/generate', insightController.generateInsights);

// Web Scraping
router.get('/scrape/:source', scraperController.scrapeSource);
router.get('/scraped-products', scraperController.getScrapedProducts);

module.exports = router;
