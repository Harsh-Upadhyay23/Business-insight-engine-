document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    // AI Insight buttons
    const generateBtn = document.getElementById('generateInsightsBtn');
    const closeBtn = document.getElementById('closeInsightsBtn');
    if (generateBtn) generateBtn.addEventListener('click', generateInsights);
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('insightsPanel').classList.add('hidden');
    });

    // Sidebar navigation — SPA tab switching
    const navLinks = document.querySelectorAll('#sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const title = link.getAttribute('data-title');

            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('page-title').textContent = title;

            document.querySelectorAll('.view-section').forEach(sec => {
                sec.classList.add('hidden');
                sec.classList.remove('active');
            });
            const target = document.getElementById(targetId);
            target.classList.remove('hidden');
            target.classList.add('active');

            if (targetId === 'orders-view') loadOrders();
            else if (targetId === 'products-view') loadProducts();
            else if (targetId === 'customers-view') loadCustomers();
            else if (targetId === 'datasources-view') loadScrapedProducts();
        });
    });

    // Scrape buttons
    document.querySelectorAll('.scrape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const source = btn.getAttribute('data-source');
            triggerScrape(source, btn);
        });
    });
});

// ==================== DASHBOARD ====================

async function initDashboard() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        if (data.error) return;

        document.getElementById('totalRevenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
        document.getElementById('totalOrders').textContent = data.totalOrders;

        renderRevenueChart(data.salesOverTime);
        renderCategoryChart(data.categoryDistribution);
        renderTopProducts(data.topProducts);
    } catch (error) {
        console.error('Error fetching dashboard:', error);
    }
}

function renderRevenueChart(salesData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesData.map(d => d.date),
            datasets: [{
                label: 'Daily Revenue ($)',
                data: salesData.map(d => d.daily_revenue),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

function renderCategoryChart(categoryData) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(d => d.category),
            datasets: [{
                data: categoryData.map(d => d.order_count),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } }
        }
    });
}

function renderTopProducts(products) {
    const tbody = document.querySelector('#topProductsTable tbody');
    tbody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name}</td><td>${p.quantity_sold}</td><td>$${p.revenue.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
}

// ==================== OTHER TABS ====================

async function loadOrders() {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const tbody = document.querySelector('#ordersTableFull tbody');
    tbody.innerHTML = '';
    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>#${o.id}</td><td>${o.customer_name}</td><td>${o.product_name}</td><td>${o.quantity}</td><td>$${o.total_price.toFixed(2)}</td><td>${o.date}</td>`;
        tbody.appendChild(tr);
    });
}

async function loadProducts() {
    const res = await fetch('/api/products');
    const products = await res.json();
    const tbody = document.querySelector('#productsTableFull tbody');
    tbody.innerHTML = '';
    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>#${p.id}</td><td>${p.name}</td><td>${p.category}</td><td>$${p.price.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
}

async function loadCustomers() {
    const res = await fetch('/api/customers');
    const customers = await res.json();
    const tbody = document.querySelector('#customersTableFull tbody');
    tbody.innerHTML = '';
    customers.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>#${c.id}</td><td>${c.name}</td><td>${c.email}</td><td>${c.total_orders}</td><td>$${c.total_spent ? c.total_spent.toFixed(2) : '0.00'}</td>`;
        tbody.appendChild(tr);
    });
}

// ==================== WEB SCRAPING ====================

async function triggerScrape(source, btn) {
    const statusSection = document.getElementById('scrapeStatus');
    const statusText = document.getElementById('scrapeStatusText');
    const statusCount = document.getElementById('scrapeCount');

    // Show status and disable button
    btn.disabled = true;
    btn.textContent = 'Scraping...';
    statusSection.classList.remove('hidden');
    statusText.textContent = `Scraping data from ${source}...`;
    statusCount.textContent = '';
    document.querySelector('.status-bar').classList.remove('success');

    try {
        const res = await fetch(`/api/scrape/${source}`);
        const data = await res.json();

        if (data.error) {
            statusText.textContent = `Error: ${data.error}`;
            statusCount.textContent = '';
        } else {
            statusText.textContent = `✅ ${data.message}`;
            statusCount.textContent = `${data.count} products`;
            document.querySelector('.status-bar').classList.add('success');

            // Show the results table
            renderScrapedProducts(data.products);
        }
    } catch (error) {
        statusText.textContent = 'Failed to connect to scraping engine.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyse Now';
    }
}

function renderScrapedProducts(products) {
    const section = document.getElementById('scrapedResultsSection');
    section.classList.remove('hidden');

    const tbody = document.querySelector('#scrapedProductsTable tbody');
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        const ratingStars = '⭐'.repeat(Math.round(p.rating));
        tr.innerHTML = `
            <td>${p.name}</td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.category}</td>
            <td>${ratingStars} (${p.rating})</td>
            <td>${p.stock}</td>
            <td><span class="source-type-badge ${p.source.includes('books') ? 'scraping' : 'api'}">${p.source}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadScrapedProducts() {
    try {
        const res = await fetch('/api/scraped-products');
        const products = await res.json();
        if (products.length > 0) {
            renderScrapedProducts(products);
        }
    } catch (e) {
        // No previously scraped products — that's fine
    }
}

// ==================== AI INSIGHTS ====================

async function generateInsights() {
    const btn = document.getElementById('generateInsightsBtn');
    const panel = document.getElementById('insightsPanel');
    const content = document.getElementById('insightsContent');
    const badge = document.getElementById('insightSource');

    btn.disabled = true;
    btn.textContent = 'Generating...';
    panel.classList.remove('hidden');
    content.innerHTML = '<p class="loading-text">Analyzing your business data using AI...</p>';
    badge.textContent = '';
    badge.className = 'insight-badge';

    try {
        const res = await fetch('/api/insights/generate');
        const data = await res.json();

        if (data.error) {
            content.innerHTML = `<p style="color: #ef4444;">Error: ${data.error}</p>`;
        } else {
            // Show source badge
            if (data.source === 'gemini') {
                badge.textContent = 'Powered by Gemini AI';
                badge.classList.add('gemini');
            } else {
                badge.textContent = 'Local Analysis';
                badge.classList.add('local');
            }

            const ul = document.createElement('ul');
            data.insights.forEach(insight => {
                const li = document.createElement('li');
                let clean = insight.replace(/^[-* ]+/, '').trim().replace(/\*\*/g, '');
                if (clean.length > 0) {
                    li.textContent = clean;
                    ul.appendChild(li);
                }
            });
            content.innerHTML = '';
            content.appendChild(ul);
        }
    } catch (error) {
        content.innerHTML = `<p style="color: #ef4444;">Failed to connect to Insight Engine.</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Generate AI Insights';
    }
}
