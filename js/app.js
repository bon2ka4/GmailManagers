/**
 * GMAIL MANAGER - CLOUD VERSION LOGIC
 * Author: Antigravity (Senior AI Developer)
 */

const SECRET_KEY = "antigravity_master_key";
let accounts = [];
let editingId = null;

// DOM Elements
const elements = {
    apiUrlInput: document.getElementById('api-url'),
    btnSync: document.getElementById('btn-sync'),
    btnAdd: document.getElementById('btn-add'),
    accountList: document.getElementById('account-list'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    form: document.getElementById('account-form'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancel: document.getElementById('btn-cancel'),
    statTotal: document.getElementById('stat-total'),
    statExpiring: document.getElementById('stat-expiring'),
    statStorage: document.getElementById('stat-storage'),
    statStorageBar: document.getElementById('stat-storage-bar'),
    btnInfo: document.getElementById('btn-info'),
    cloudInfo: document.getElementById('cloud-info')
};

// --- STORAGE LOGIC (CLOUD) ---

// Load API URL từ localStorage nếu có
const savedApiUrl = localStorage.getItem('gmail_tool_api_url');
if (savedApiUrl) {
    elements.apiUrlInput.value = savedApiUrl;
    loadData(); // Tự động load nếu có URL
}

async function loadData() {
    const apiUrl = elements.apiUrlInput.value.trim();
    if (!apiUrl) return;

    localStorage.setItem('gmail_tool_api_url', apiUrl);
    elements.btnSync.innerHTML = `<i data-lucide="refresh-cw" class="w-5 h-5 animate-spin"></i> <span>Đang tải...</span>`;
    lucide.createIcons();

    try {
        const response = await fetch(apiUrl);
        const encryptedContent = await response.text();
        
        if (encryptedContent && encryptedContent !== "[]") {
            const bytes = CryptoJS.AES.decrypt(encryptedContent, SECRET_KEY);
            accounts = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } else {
            accounts = [];
        }
        
        elements.btnSync.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5 text-emerald-500"></i> <span>Đã đồng bộ</span>`;
    } catch (err) {
        console.error("Cloud load failed:", err);
        alert("Lỗi kết nối Cloud. Vui lòng kiểm tra lại API URL.");
        elements.btnSync.innerHTML = `<i data-lucide="refresh-cw" class="w-5 h-5"></i> <span>Thử lại</span>`;
    }
    
    lucide.createIcons();
    render();
}

async function saveData() {
    const apiUrl = elements.apiUrlInput.value.trim();
    if (!apiUrl) {
        alert("Vui lòng nhập API URL để lưu dữ liệu lên Cloud!");
        return;
    }

    const dataString = JSON.stringify(accounts);
    const encryptedData = CryptoJS.AES.encrypt(dataString, SECRET_KEY).toString();

    try {
        await fetch(apiUrl, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script yêu cầu no-cors hoặc xử lý OPTIONS phức tạp
            body: encryptedData
        });
        // Note: no-cors sẽ không trả về response body, nhưng data vẫn được gửi đi.
        console.log("Data sent to Cloud");
    } catch (err) {
        console.error("Cloud save failed:", err);
    }
}

// --- UI LOGIC ---

function render() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filter = elements.filterStatus.value;
    
    const filtered = accounts.filter(acc => {
        const matchesSearch = acc.account.toLowerCase().includes(searchTerm) || 
                              acc.phone?.includes(searchTerm) || 
                              acc.password.toLowerCase().includes(searchTerm);
        
        if (filter === 'all') return matchesSearch;
        const isExpiring = checkExpiring(acc.expiry_date);
        if (filter === 'warning') return matchesSearch && isExpiring;
        if (filter === 'normal') return matchesSearch && !isExpiring;
        return matchesSearch;
    });

    elements.statTotal.innerText = accounts.length;
    const expiringCount = accounts.filter(acc => checkExpiring(acc.expiry_date)).length;
    elements.statExpiring.innerText = expiringCount;
    
    let totalStorage = 0, usedStorage = 0;
    accounts.forEach(acc => {
        totalStorage += parseFloat(acc.storage_total || 15);
        usedStorage += parseFloat(acc.storage_used || 0);
    });
    const storagePercent = totalStorage > 0 ? Math.round((usedStorage / totalStorage) * 100) : 0;
    elements.statStorage.innerText = `${storagePercent}%`;
    elements.statStorageBar.style.width = `${storagePercent}%`;

    if (filtered.length === 0) {
        elements.accountList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
        elements.accountList.innerHTML = filtered.map(acc => `
            <tr class="hover:bg-white/5 transition-colors group">
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-semibold text-white">${acc.account}</span>
                        <div class="flex items-center gap-2 text-xs text-slate-500 relative">
                            <span>Pass: ••••••••</span>
                            <button onclick="window.copyToClipboard('${acc.password}', this)" class="hover:text-blue-400"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm">
                    <div class="text-slate-300">${acc.phone || 'N/A'}</div>
                    <div class="text-xs text-slate-500">${acc.recovery_email || ''}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div class="h-full bg-blue-500" style="width: ${(acc.storage_used/acc.storage_total)*100}%"></div>
                        </div>
                        <span class="text-xs text-slate-400">${acc.storage_used}/${acc.storage_total}GB</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        <span class="px-2.5 py-1 rounded-full text-xs font-medium ${checkExpiring(acc.expiry_date) ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'} w-fit">
                            Exp: ${acc.expiry_date || 'N/A'}
                        </span>
                        <span class="text-[10px] text-slate-500 ml-1">Tạo: ${acc.create_date || 'N/A'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editAccount('${acc.id}')" class="p-2 hover:bg-blue-600/20 hover:text-blue-400 rounded-lg transition-all"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        <button onclick="window.deleteAccount('${acc.id}')" class="p-2 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }
}

function checkExpiring(dateStr) {
    if (!dateStr) return false;
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) < 7;
}

// --- ACTIONS ---

window.copyToClipboard = (text, btn) => {
    navigator.clipboard.writeText(text);
    const feedback = document.createElement('span');
    feedback.className = 'copy-feedback';
    feedback.innerText = 'Copied!';
    btn.parentElement.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1000);
};

window.editAccount = (id) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    editingId = id;
    elements.modalTitle.innerText = "Chỉnh sửa tài khoản";
    for (let key in acc) {
        if (elements.form[key]) elements.form[key].value = acc[key];
    }
    elements.modal.classList.add('active');
};

window.deleteAccount = async (id) => {
    if (confirm('Xóa tài khoản này?')) {
        accounts = accounts.filter(a => a.id !== id);
        await saveData();
        render();
    }
};

// --- EVENTS ---

elements.btnSync.addEventListener('click', loadData);

elements.btnAdd.addEventListener('click', () => {
    editingId = null;
    elements.modalTitle.innerText = "Thêm tài khoản mới";
    elements.form.reset();
    elements.modal.classList.add('active');
});

elements.btnCloseModal.addEventListener('click', () => elements.modal.classList.remove('active'));
elements.btnCancel.addEventListener('click', () => elements.modal.classList.remove('active'));

elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(elements.form);
    const data = Object.fromEntries(formData.entries());
    
    if (editingId) {
        const index = accounts.findIndex(a => a.id === editingId);
        accounts[index] = { ...accounts[index], ...data };
    } else {
        data.id = Date.now().toString();
        accounts.push(data);
    }
    
    await saveData();
    elements.modal.classList.remove('active');
    render();
    // Re-load để đảm bảo sync thành công
    setTimeout(loadData, 1000);
});

elements.searchInput.addEventListener('input', render);
elements.filterStatus.addEventListener('change', render);

elements.btnInfo.addEventListener('click', () => {
    elements.cloudInfo.classList.toggle('opacity-0');
    elements.cloudInfo.classList.toggle('pointer-events-none');
});

// Initial Render
render();
