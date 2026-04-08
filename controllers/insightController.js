const analyticsModel = require('../models/analyticsModel');

/**
 * Generate AI-powered business insights.
 * 
 * How it works:
 * 1. Fetches computed analytics from the database (order data + scraped product data).
 * 2. Builds a structured prompt describing the business data.
 * 3. Sends the prompt to Google Gemini via LangChain's ChatGoogle.
 * 4. Parses the AI response into individual insight bullet points.
 * 5. If Gemini is unavailable (no key, 403, quota exceeded, etc.),
 *    falls back to locally generated insights based on the same metrics.
 */
async function generateInsights(req, res) {
    // Fetch metrics FIRST, outside try/catch for the API call
    let metrics, scrapedMetrics;
    try {
        metrics = await analyticsModel.getDashboardMetrics();
        scrapedMetrics = await analyticsModel.getScrapedMetrics();
    } catch (dbError) {
        console.error('Database error fetching metrics:', dbError.message);
        return res.status(500).json({ error: 'Failed to load analytics data from database.' });
    }

    // Build a rich prompt combining order data and scraped product data
    let promptData = `
        You are an expert eCommerce Business Analyst.
        Analyze the following eCommerce data and provide 4-6 concise, actionable business insights in plain English.
        Focus on trends, inventory actions, pricing strategy, and customer behavior.
        Do not include any greetings or markdown formatting like asterisks or bold text, just provide bullet points.

        ORDER DATA:
        - Total Revenue: $${metrics.totalRevenue.toFixed(2)}
        - Total Orders: ${metrics.totalOrders}
        - Top Products by Revenue: ${metrics.topProducts.map(p => `${p.name} ($${p.revenue.toFixed(2)})`).join(', ')}
        - Low Performing Products: ${metrics.lowPerformingProducts.map(p => `${p.name} ($${p.revenue.toFixed(2)})`).join(', ')}
        - Categories by Orders: ${metrics.categoryDistribution.map(c => `${c.category} (${c.order_count} orders, $${c.category_revenue.toFixed(2)})`).join(', ')}
    `;

    // If we have scraped product data, include it in the prompt
    if (scrapedMetrics) {
        promptData += `

        SCRAPED MARKET DATA (real-time from eCommerce sources):
        - Total Products Scraped: ${scrapedMetrics.totalProducts}
        - Average Market Price: $${scrapedMetrics.avgPrice.toFixed(2)}
        - Price Range: $${scrapedMetrics.minPrice.toFixed(2)} - $${scrapedMetrics.maxPrice.toFixed(2)}
        - Top Rated Products: ${scrapedMetrics.topRated.map(p => `${p.name} (${p.rating}/5, $${p.price})`).join(', ')}
        - Low Stock Alerts: ${scrapedMetrics.lowStock.map(p => `${p.name} (${p.stock} left)`).join(', ')}
        - Categories: ${scrapedMetrics.categoryBreakdown.map(c => `${c.category} (${c.product_count} products, avg $${c.avg_price.toFixed(2)}, rating ${c.avg_rating.toFixed(1)})`).join(', ')}
        - Data Sources: ${scrapedMetrics.sources.map(s => `${s.source} (${s.count} products)`).join(', ')}
        `;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If a valid API key exists, attempt to call Gemini
    if (apiKey && apiKey.trim().length > 0) {
        try {
            const { ChatGoogle } = require('@langchain/google');

            const llm = new ChatGoogle({
                apiKey: apiKey,
                model: "gemini-2.5-flash",
            });

            const response = await llm.invoke(promptData);
            const insights = response.content.split('\n').filter(line => line.trim().length > 0);
            return res.json({ insights, source: 'gemini' });

        } catch (aiError) {
            console.error('Gemini API failed, falling back to local insights:', aiError.message);
        }
    }

    // Fallback: generate insights locally from the database metrics
    const insights = generateLocalInsights(metrics, scrapedMetrics);
    return res.json({ insights, source: 'local' });
}

/**
 * Generates business insights locally using the computed metrics.
 * Used as a fallback when the Gemini API is unavailable.
 */
function generateLocalInsights(metrics, scrapedMetrics) {
    const insights = [];

    const avgOrderValue = metrics.totalOrders > 0
        ? (metrics.totalRevenue / metrics.totalOrders).toFixed(2)
        : 0;
    insights.push(
        `Your store generated $${metrics.totalRevenue.toFixed(2)} in total revenue across ${metrics.totalOrders} orders, with an average order value of $${avgOrderValue}.`
    );

    if (metrics.topProducts.length > 0) {
        const top = metrics.topProducts[0];
        insights.push(
            `"${top.name}" is your best-selling product with ${top.quantity_sold} units sold generating $${top.revenue.toFixed(2)} in revenue. Consider increasing inventory and running featured promotions.`
        );
    }

    if (metrics.lowPerformingProducts.length > 0) {
        const low = metrics.lowPerformingProducts[0];
        insights.push(
            `"${low.name}" is underperforming with only $${low.revenue.toFixed(2)} in revenue. Consider a targeted discount campaign or bundling it with popular products.`
        );
    }

    // Scraped data insights
    if (scrapedMetrics) {
        insights.push(
            `Market analysis from ${scrapedMetrics.totalProducts} scraped products shows an average market price of $${scrapedMetrics.avgPrice.toFixed(2)} (range: $${scrapedMetrics.minPrice.toFixed(2)} - $${scrapedMetrics.maxPrice.toFixed(2)}).`
        );

        if (scrapedMetrics.topRated.length > 0) {
            const best = scrapedMetrics.topRated[0];
            insights.push(
                `"${best.name}" is the highest-rated product (${best.rating}/5) at $${best.price}. Consider sourcing similar products or adjusting pricing to compete in the "${best.category}" category.`
            );
        }

        if (scrapedMetrics.lowStock.length > 0) {
            const lowStockNames = scrapedMetrics.lowStock.map(p => `${p.name} (${p.stock} left)`).join(', ');
            insights.push(
                `Low stock alert: ${lowStockNames}. These items may sell out soon — consider restocking or finding alternative suppliers.`
            );
        }
    } else {
        insights.push(
            `No market data available yet. Use the "Data Sources" tab to scrape real eCommerce product data for deeper market analysis.`
        );
    }

    return insights;
}

module.exports = {
    generateInsights
};
