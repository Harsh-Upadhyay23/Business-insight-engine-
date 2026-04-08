const analyticsModel = require('../models/analyticsModel');

async function getDashboardData(req, res) {
    try {
        const metrics = await analyticsModel.getDashboardMetrics();
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error while fetching dashboard data.' });
    }
}

async function getOrdersData(req, res) {
    try { res.json(await analyticsModel.getOrders()); } 
    catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
}

async function getProductsData(req, res) {
    try { res.json(await analyticsModel.getProducts()); } 
    catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
}

async function getCustomersData(req, res) {
    try { res.json(await analyticsModel.getCustomers()); } 
    catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
}

module.exports = {
    getDashboardData,
    getOrdersData,
    getProductsData,
    getCustomersData
};
