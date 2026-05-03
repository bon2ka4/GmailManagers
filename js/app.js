/**
 * GMAIL MANAGER - CLOUD VERSION LOGIC (ADJUSTED)
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
    btnDelete: document.getElementById('btn-delete-account'),
    statTotal: document.getElementById('stat-total'),
    statExpiring: document.getElementById('stat-expiring'),
    statStorage: document.getElementById('stat-storage'),
    statStorageBar: document.getElementById('stat-storage-bar'),
    btnInfo: document.getElementById('btn-info'),
    cloudInfo: document.getElementById('cloud-info')
};

// --- STORAGE LOGIC (CLOUD) ---

const savedApiUrl = localStorage.getItem('gmail_tool_api_url');
if (savedApiUrl) {
    elements.apiUrlInput.value = savedApiUrl;
    loadData();
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
        elements.btnSync.innerHTML = `<i data-lucide="refresh-cw" class="w-5 h-5"></i> <span>Lỗi Sync</span>`;
    }
    lucide.createIcons();
    render();
}

async function saveData() {
    const apiUrl = elements.apiUrlInput.value.trim();
    if (!apiUrl) return;
    const dataString = JSON.stringify(accounts);
    const encryptedData = CryptoJS.AES.encrypt(dataString, SECRET_KEY).toString();
    try {
        await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: encryptedData });
    } catch (err) { console.error("Cloud save failed:", err); }
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
    
    // Dung lượng chỉ tính dựa trên số lượng gói
    let totalStorageCount = accounts.reduce((sum, acc) => sum + parseFloat(acc.storage_total || 0), 0);
    elements.statStorage.innerText = `${totalStorageCount} GB`;
    elements.statStorageBar.style.width = `100%`;

    if (filtered.length === 0) {
        elements.accountList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
        elements.accountList.innerHTML = filtered.map(acc => `
            <tr class="hover:bg-white/5 transition-colors cursor-pointer group" onclick="window.editAccount('${acc.id}')">
                <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 group/item" onclick="event.stopPropagation()">
                            <span class="font-semibold text-white">${acc.account}</span>
                            <button onclick="window.copyToClipboard('${acc.account}', this)" class="opacity-0 group-hover/item:opacity-100 hover:text-blue-400 transition-opacity"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-blue-400 relative" onclick="event.stopPropagation()">
                            <span class="bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono">${acc.password}</span>
                            <button onclick="window.copyToClipboard('${acc.password}', this)" class="hover:text-white"><i data-lucide="copy" class="w-3 h-3"></i></button>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm">
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 text-slate-300 group/item" onclick="event.stopPropagation()">
                            <span>${acc.phone || 'N/A'}</span>
                            ${acc.phone ? `<button onclick="window.copyToClipboard('${acc.phone}', this)" class="opacity-0 group-hover/item:opacity-100 hover:text-blue-400 transition-opacity"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                        </div>
                        <div class="flex items-center gap-2 text-[10px] text-slate-500 group/item" onclick="event.stopPropagation()">
                            <span>${acc.recovery_email || ''}</span>
                            ${acc.recovery_email ? `<button onclick="window.copyToClipboard('${acc.recovery_email}', this)" class="opacity-0 group-hover/item:opacity-100 hover:text-blue-400 transition-opacity"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <div class="p-1.5 bg-purple-500/10 rounded-lg"><i data-lucide="cloud" class="w-3.5 h-3.5 text-purple-400"></i></div>
                        <span class="text-sm font-medium text-slate-300">${acc.storage_total || 15} ${acc.storage_unit || 'GB'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex flex-col items-end gap-1">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${checkExpiring(acc.expiry_date) ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'} w-fit">
                            HẾT HẠN: ${acc.expiry_date ? acc.expiry_date : 'VĨNH VIỄN'}
                        </span>
                        <span class="text-[10px] text-slate-500">Chôn: ${acc.create_date || 'N/A'}</span>
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
    elements.btnDelete.classList.remove('hidden');
    for (let key in acc) {
        if (elements.form[key]) elements.form[key].value = acc[key];
    }
    elements.modal.classList.add('active');
};

// --- EVENTS ---

elements.btnSync.addEventListener('click', loadData);

elements.btnAdd.addEventListener('click', () => {
    editingId = null;
    elements.modalTitle.innerText = "Thêm tài khoản mới";
    elements.btnDelete.classList.add('hidden');
    elements.form.reset();
    elements.modal.classList.add('active');
});

elements.btnCloseModal.addEventListener('click', () => elements.modal.classList.remove('active'));
elements.btnCancel.addEventListener('click', () => elements.modal.classList.remove('active'));

elements.btnDelete.addEventListener('click', async () => {
    if (editingId && confirm('Đại Ca có chắc muốn XÓA vĩnh viễn tài khoản này?')) {
        accounts = accounts.filter(a => a.id !== editingId);
        await saveData();
        elements.modal.classList.remove('active');
        render();
        setTimeout(loadData, 1000);
    }
});

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
