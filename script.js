// --- 1. State Management (LocalStorage) ---
const LS_KEY = 'inventoryData';

// Load data or inject a dummy entry if it's completely empty based on the design screenshot context
function loadData() {
    const rawData = localStorage.getItem(LS_KEY);
    if (rawData) {
        return JSON.parse(rawData);
    } else {
        return [];
    }
}

let inventoryData = loadData();
let chartInstance = null;

// --- 2. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    updateDropdowns();
    renderProductTable();
});

// --- 3. UI Flow & Navigation ---
function switchView(viewId, title, btnElement) {

    document.getElementById('currentViewTitle').innerText = title;

    // Toggle sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden-view'));
    document.getElementById(viewId).classList.remove('hidden-view');

    // Apply navigation visual styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
    });
    if (btnElement) {
        btnElement.classList.add('active-nav');
    }

    // Close mobile menu
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    // Context-specific rendering
    if (viewId === 'dashboardView') {
        renderDashboard();
    } else if (viewId === 'productMasterView') {
        renderProductTable();
    } else {
        updateDropdowns();
    }
}

// Mobile Menu Toggles
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.remove('hidden');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebarOverlay').classList.add('hidden');
});

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    const icon = toast.querySelector('i');

    msgEl.innerText = message;
    if (isError) {
        icon.className = 'fas fa-exclamation-circle text-red-400 text-lg';
    } else {
        icon.className = 'fas fa-check-circle text-green-400 text-lg';
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
}

function saveData() {
    localStorage.setItem(LS_KEY, JSON.stringify(inventoryData));
}

// --- 4. Dashboard Features ---
function renderDashboard() {
    // Stats Math
    const totalProducts = inventoryData.length;
    const totalValue = inventoryData.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const lowStockItems = inventoryData.filter(item => item.stock <= item.limit);

    document.getElementById('statTotalProducts').innerText = totalProducts;
    document.getElementById('statTotalValue').innerText = '₹' + totalValue.toLocaleString('en-IN');
    document.getElementById('statAlerts').innerText = lowStockItems.length;

    // Low Stock Alert Cards rendering
    const alertContainer = document.getElementById('lowStockAlertContainer');
    const cardsContainer = document.getElementById('lowStockCards');

    if (lowStockItems.length > 0) {
        alertContainer.classList.remove('hidden');

        cardsContainer.innerHTML = lowStockItems.map(item => `
            <div class="bg-white border border-red-200 rounded-xl p-4 shadow-sm relative transition hover:shadow">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-bold text-gray-800 pr-2">${item.name}</span>
                    <span class="text-red-600 font-bold text-2xl leading-none">${item.stock}</span>
                </div>
                <div class="flex justify-between items-end border-t border-gray-100 pt-2.5 mt-2">
                    <span class="text-gray-500 text-sm font-medium">Limit: ${item.limit}</span>
                    <span class="text-red-500 text-[11px] font-bold uppercase tracking-wider">Remaining</span>
                </div>
            </div>
        `).join('');
    } else {
        alertContainer.classList.add('hidden');
        cardsContainer.innerHTML = '';
    }

    updateChart();
}

function updateChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    // Slice to max 15 items for Chart clarity
    const renderData = inventoryData.slice(0, 15);
    const labels = renderData.map(i => i.name);
    const dataStocks = renderData.map(i => i.stock);

    // Red color for low stock, Blue for safe stock
    const bgColors = renderData.map(i => i.stock <= i.limit ? '#ef4444' : '#3b82f6');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stock Quantity',
                data: dataStocks,
                backgroundColor: bgColors,
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1e293b', padding: 12, bodyFont: { size: 14 } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { precision: 0 }
                },
                x: {
                    grid: { display: false },
                    ticks: { maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

function downloadBackup() {
    if (inventoryData.length === 0) {
        showToast("No data available to download.", true);
        return;
    }

    let csv = "Product Name,Price (INR),Current Stock,Low Stock Limit\n";
    inventoryData.forEach(item => {
        const safeName = item.name.replace(/"/g, '""');
        csv += `"${safeName}",${item.price},${item.stock},${item.limit}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `GuptaJiStock_${new Date().toISOString().split('T')[0]}.csv`);
    a.style.visibility = 'hidden';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('CSV Backup downloaded successfully!');
}

// --- 5. Product Master Features ---
function renderProductTable() {
    const tbody = document.getElementById('productTableBody');
    const emptyMsg = document.getElementById('emptyTableMsg');

    if (inventoryData.length === 0) {
        tbody.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    tbody.innerHTML = inventoryData.map((item, idx) => `
        <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
            <td class="py-3 px-6 text-gray-500 font-medium">${idx + 1}</td>
            <td class="py-3 px-6 font-semibold text-gray-900">${item.name}</td>
            <td class="py-3 px-6 text-green-600 font-semibold">₹${Number(item.price).toFixed(2)}</td>
            <td class="py-3 px-6">
                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold shadow-sm border ${item.stock <= item.limit ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}">
                    ${item.stock}
                </span>
            </td>
            <td class="py-3 px-6 text-gray-500 font-medium">${item.limit}</td>
            <td class="py-3 px-6">
                <div class="flex justify-center gap-2">
                    <button onclick="editProduct(${item.id})" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition" title="Edit">
                        <i class="fas fa-pen text-sm"></i>
                    </button>
                    <button onclick="deleteProduct(${item.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition" title="Delete">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('p_name').value.trim();
    const price = parseFloat(document.getElementById('p_price').value);
    const stock = parseInt(document.getElementById('p_stock').value);
    const limit = parseInt(document.getElementById('p_limit').value);

    if (id) {
        const idx = inventoryData.findIndex(i => i.id == id);
        if (idx > -1) {
            inventoryData[idx] = { id: parseInt(id), name, price, stock, limit };
            showToast('Product updated successfully!');
        }
    } else {
        inventoryData.push({ id: Date.now(), name, price, stock, limit });
        showToast('Product added successfully!');
    }

    saveData();
    resetProductForm();
    renderProductTable();
}

function editProduct(id) {
    const product = inventoryData.find(i => i.id == id);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('p_name').value = product.name;
    document.getElementById('p_price').value = product.price;
    document.getElementById('p_stock').value = product.stock;
    document.getElementById('p_limit').value = product.limit;

    document.getElementById('productFormTitle').innerHTML = `Edit Product: <span class="text-gray-500 font-normal">${product.name}</span>`;

    const btn = document.getElementById('productSubmitBtn');
    btn.innerHTML = '<i class="fas fa-save"></i> <span>Update Product</span>';
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    btn.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('productFormTitle').innerText = 'Add New Product';

    const btn = document.getElementById('productSubmitBtn');
    btn.innerHTML = '<i class="fas fa-plus"></i> <span>Save Product</span>';
    btn.classList.replace('bg-green-600', 'bg-blue-600');
    btn.classList.replace('hover:bg-green-700', 'hover:bg-blue-700');
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        inventoryData = inventoryData.filter(i => i.id != id);
        saveData();
        renderProductTable();
        showToast('Product deleted!', true);
    }
}

// --- 6. Stock Transaction Features ---
function updateDropdowns() {
    const options = '<option value="">-- Choose Product --</option>' +
        inventoryData.map(i => `<option value="${i.id}">${i.name} (Available: ${i.stock})</option>`).join('');

    document.getElementById('in_product').innerHTML = options;
    document.getElementById('out_product').innerHTML = options;
}

function updateExampleLogic(type) {
    const selId = type === 'in' ? 'in_product' : 'out_product';
    const inputId = type === 'in' ? 'in_qty' : 'out_qty';
    const oldStockId = type === 'in' ? 'in_old_stock' : 'out_old_stock';
    const newStockId = type === 'in' ? 'in_new_stock' : 'out_new_stock';
    const totalStockId = type === 'in' ? 'in_total_stock' : 'out_total_stock';
    const submitBtnId = type === 'in' ? 'in_submit_btn' : 'out_submit_btn';

    const prodId = document.getElementById(selId).value;
    const qtyInput = document.getElementById(inputId).value;
    const qty = parseInt(qtyInput);

    const oldStockEl = document.getElementById(oldStockId);
    const newStockEl = document.getElementById(newStockId);
    const totalStockEl = document.getElementById(totalStockId);
    const submitBtn = document.getElementById(submitBtnId);

    let currentStock = 0;

    if (prodId) {
        const product = inventoryData.find(i => i.id == prodId);
        if (product) currentStock = product.stock;
    }

    oldStockEl.innerText = currentStock;

    const validQty = (!isNaN(qty) && qty > 0) ? qty : 0;
    newStockEl.innerText = validQty;

    let total = 0;
    if (type === 'in') {
        total = currentStock + validQty;
        // Button Styling
        if (prodId && validQty > 0) {
            submitBtn.disabled = false;
            submitBtn.className = "w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all shadow-sm mt-2 font-medium flex justify-center items-center gap-2";
        } else {
            submitBtn.disabled = true;
            submitBtn.className = "w-full bg-[#d1d5db] text-white px-6 py-3 rounded-lg transition-all shadow-sm mt-2 font-medium flex justify-center items-center gap-2";
        }
    } else {
        total = currentStock - validQty;
        // Button Styling
        if (prodId && validQty > 0 && total >= 0) {
            submitBtn.disabled = false;
            submitBtn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all shadow-sm mt-2 font-medium flex justify-center items-center gap-2";
        } else {
            submitBtn.disabled = true;
            submitBtn.className = "w-full bg-[#d1d5db] text-white px-6 py-3 rounded-lg transition-all shadow-sm mt-2 font-medium flex justify-center items-center gap-2";
        }
    }

    totalStockEl.innerText = total;

    // Highlight negative total as error
    if (total < 0) {
        totalStockEl.classList.remove('text-gray-800');
        totalStockEl.classList.add('text-red-600');
    } else {
        totalStockEl.classList.add('text-gray-800');
        totalStockEl.classList.remove('text-red-600');
    }
}

function resetStockForms() {
    document.getElementById('in_product').value = '';
    document.getElementById('in_qty').value = '';
    document.getElementById('out_product').value = '';
    document.getElementById('out_qty').value = '';
    updateExampleLogic('in');
    updateExampleLogic('out');
}

function handleStockTransaction(e, type) {
    e.preventDefault();
    const selId = type === 'in' ? 'in_product' : 'out_product';
    const inputId = type === 'in' ? 'in_qty' : 'out_qty';

    const prodId = document.getElementById(selId).value;
    const qty = parseInt(document.getElementById(inputId).value);

    if (!prodId || isNaN(qty) || qty <= 0) return;

    const idx = inventoryData.findIndex(i => i.id == prodId);
    if (idx === -1) return;

    if (type === 'out') {
        if (inventoryData[idx].stock < qty) {
            showToast('Error: Not enough stock available!', true);
            return;
        }
        inventoryData[idx].stock -= qty;
        showToast(`SUCCESS: Depleted ${qty} units of ${inventoryData[idx].name}`);
    } else {
        inventoryData[idx].stock += qty;
        showToast(`SUCCESS: Received ${qty} units of ${inventoryData[idx].name}`);
    }

    saveData();
    resetStockForms(); // clear forms properly
    updateDropdowns(); // immediate refresh
    updateExampleLogic(type); // Reset example logic after save
}

