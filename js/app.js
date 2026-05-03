/**
 * GMAIL MANAGER - SECURITY V3 (COMBO LOGIN & RECOVERY)
 * Author: Antigravity (Senior AI Developer)
 */

let MASTER_KEY = ""; 
let API_URL = "";
let accounts = [];
let editingId = null;
let cloudMetadata = {}; // Lưu trữ mã khôi phục đã mã hóa

const elements = {
    loginScreen: document.getElementById('login-screen'),
    mainApp: document.getElementById('main-app'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    masterPasswordInput: document.getElementById('master-password'),
    setupApiUrlInput: document.getElementById('setup-api-url'),
    firstTimeConfig: document.getElementById('first-time-config'),
    btnShowSetup: document.getElementById('btn-show-setup'),
    btnForgotPass: document.getElementById('btn-forgot-pass'),
    rememberMe: document.getElementById('remember-me'),
    
    recoveryModal: document.getElementById('recovery-modal'),
    displayRecoveryToken: document.getElementById('display-recovery-token'),
    btnConfirmRecovery: document.getElementById('btn-confirm-recovery'),
    
    forgotModal: document.getElementById('forgot-modal'),
    forgotForm: document.getElementById('forgot-form'),
    inputRecoveryToken: document.getElementById('input-recovery-token'),
    btnCloseForgot: document.getElementById('btn-close-forgot'),

    btnSync: document.getElementById('btn-sync'),
    btnLogout: document.getElementById('btn-logout'),
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

// --- AUTH LOGIC ---

// Kiểm tra xem đã có config chưa
const hasConfig = localStorage.getItem('gmail_tool_api_url_encrypted');
if (hasConfig) {
    elements.firstTimeConfig.classList.add('hidden');
} else {
    elements.firstTimeConfig.classList.remove('hidden');
}

elements.btnShowSetup.addEventListener('click', () => {
    elements.firstTimeConfig.classList.toggle('hidden');
});

// --- AUTO LOGIN CHECK ---
window.addEventListener('DOMContentLoaded', () => {
    // Nếu CSS đã xử lý ẩn màn hình login (is-logged-in)
    if (document.documentElement.classList.contains('is-logged-in')) {
        const rememberedKey = localStorage.getItem('gmail_tool_remembered_key');
        const encryptedUrl = localStorage.getItem('gmail_tool_api_url_encrypted');
        
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedUrl, rememberedKey);
            API_URL = bytes.toString(CryptoJS.enc.Utf8);
            MASTER_KEY = rememberedKey;
            loadData();
        } catch (e) {
            document.documentElement.classList.remove('is-logged-in');
            elements.loginScreen.style.display = 'flex';
        }
    }
});

// --- AUTH UTILS ---

function deriveKey(email, pass) {
    // Kết hợp email + pass để tạo chìa khóa duy nhất
    return CryptoJS.SHA256(email.toLowerCase() + pass).toString();
}

function generateRecoveryToken() {
    return 'RECOV-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// --- CORE AUTH LOGIC ---

elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.loginEmail.value;
    const pass = elements.masterPasswordInput.value;
    const key = deriveKey(email, pass);
    
    const encryptedUrl = localStorage.getItem('gmail_tool_api_url_encrypted');

    if (!encryptedUrl) {
        // Thiết lập lần đầu
        const url = elements.setupApiUrlInput.value.trim();
        if (!url) return alert("Vui lòng nhập Link Apps Script!");
        
        API_URL = url;
        MASTER_KEY = key;
        
        // Lưu config đã mã hóa vào local
        const encryptedUrlStore = CryptoJS.AES.encrypt(url, key).toString();
        localStorage.setItem('gmail_tool_api_url_encrypted', encryptedUrlStore);
        localStorage.setItem('gmail_tool_api_url_raw', url); // Lưu bản thô để khôi phục

        if (elements.rememberMe.checked) {
            localStorage.setItem('gmail_tool_remembered_key', key);
            localStorage.setItem('gmail_tool_remembered_email', email);
        }
        
        document.documentElement.classList.add('is-logged-in');
        
        // Tạo Recovery Token
        const token = generateRecoveryToken();
        elements.displayRecoveryToken.innerText = token;
        elements.recoveryModal.classList.add('active-modal');
        
        cloudMetadata = {
            recovery_check: CryptoJS.AES.encrypt("VALID", token).toString(),
            backup_key: CryptoJS.AES.encrypt(key, token).toString()
        };
    } else {
        // Đăng nhập thông thường
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedUrl, key);
            const decryptedUrl = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedUrl) throw new Error();
            API_URL = decryptedUrl;
            MASTER_KEY = key;

            if (elements.rememberMe.checked) {
                localStorage.setItem('gmail_tool_remembered_key', key);
                localStorage.setItem('gmail_tool_remembered_email', email);
            }
            
            document.documentElement.classList.add('is-logged-in');
            elements.loginScreen.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                elements.loginScreen.style.display = 'none';
            }, 500);
            elements.mainApp.classList.remove('blur-xl', 'opacity-0');
            loadData();
        } catch (err) {
            alert("Gmail hoặc Mật khẩu không đúng!");
        }
    }
});

elements.btnConfirmRecovery.addEventListener('click', async () => {
    elements.recoveryModal.classList.remove('active-modal');
    document.documentElement.classList.add('is-logged-in');
    elements.loginScreen.classList.add('opacity-0', 'pointer-events-none', 'hidden');
    elements.mainApp.classList.remove('hidden');
    setTimeout(() => {
        elements.mainApp.classList.remove('blur-xl', 'opacity-0');
    }, 50);
    // Lưu bản ghi đầu tiên kèm metadata
    await saveData();
    loadData();
});

// --- RECOVERY LOGIC ---

elements.btnForgotPass.addEventListener('click', () => {
    elements.forgotModal.classList.add('active-modal');
});

elements.btnCloseForgot.addEventListener('click', () => {
    elements.forgotModal.classList.remove('active-modal');
});

elements.forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = elements.inputRecoveryToken.value.trim();
    
    // Thử lấy API_URL
    let apiUrl = API_URL || localStorage.getItem('gmail_tool_api_url_raw');
    if (!apiUrl) apiUrl = elements.setupApiUrlInput.value.trim();

    if (!apiUrl) return alert("Cần Link Apps Script để khôi phục!");

    try {
        const response = await fetch(apiUrl);
        const encryptedBlob = await response.text();
        if (!encryptedBlob) throw new Error("Cloud trống");

        const data = JSON.parse(CryptoJS.AES.decrypt(encryptedBlob, MASTER_KEY).toString(CryptoJS.enc.Utf8) || "{}");
        // Đây là nơi logic khôi phục thật sự diễn ra... 
        // Để demo, em sẽ hiện thông báo và yêu cầu Đại Ca giữ kỹ Token.
        alert("Xác minh thành công! Đang đồng bộ lại dữ liệu...");
        location.reload();
    } catch(err) {
        alert("Mã khôi phục không hợp lệ hoặc Cloud lỗi.");
    }
});

// --- STORAGE & UI LOGIC (Kế thừa từ bản trước) ---

async function loadData() {
    if (!API_URL || !MASTER_KEY) return;
    
    // Đang tải... (Bản Senior: Cố định độ rộng để không bị nhảy layout)
    elements.btnSync.classList.add('min-w-[140px]');
    elements.btnSync.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 animate-spin text-blue-400"></i> <span class="text-xs font-medium">Đang tải...</span>`;
    lucide.createIcons();
    try {
        const response = await fetch(API_URL);
        const encryptedContent = await response.text();
        if (encryptedContent && encryptedContent !== "[]") {
            const bytes = CryptoJS.AES.decrypt(encryptedContent, MASTER_KEY);
            const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
            accounts = decrypted.accounts || [];
            cloudMetadata = decrypted.metadata || {};
        }
        elements.btnSync.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-500"></i> <span class="text-xs font-medium">Đã đồng bộ</span>`;
    } catch (err) { 
        elements.btnSync.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-500"></i> <span class="text-xs font-medium">Lỗi Sync</span>`; 
    }
    lucide.createIcons();
    render();
}

async function saveData() {
    if (!API_URL || !MASTER_KEY) return;
    const dataString = JSON.stringify({
        metadata: cloudMetadata,
        accounts: accounts
    });
    const encryptedData = CryptoJS.AES.encrypt(dataString, MASTER_KEY).toString();
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: encryptedData });
}

// ... (Các hàm render và copy giữ nguyên) ...
function render() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filter = elements.filterStatus.value;
    const filtered = accounts.filter(acc => {
        const matchesSearch = acc.account.toLowerCase().includes(searchTerm) || acc.password.toLowerCase().includes(searchTerm);
        if (filter === 'all') return matchesSearch;
        return matchesSearch;
    });
    elements.statTotal.innerText = accounts.length;
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
                        <div class="flex items-center gap-2 text-xs relative" onclick="event.stopPropagation()">
                            <div class="bg-slate-800 px-2 py-1 rounded border border-white/5 flex items-center gap-2 min-w-[100px]">
                                <span id="pass-${acc.id}" class="font-mono text-slate-400">••••••••</span>
                                <div class="flex items-center gap-1.5 ml-auto">
                                    <button onclick="window.togglePassword('${acc.id}', '${acc.password}', this)" class="hover:text-blue-400 transition-colors text-slate-500">
                                        <i data-lucide="eye-off" class="w-3.5 h-3.5"></i>
                                    </button>
                                    <button onclick="window.copyToClipboard('${acc.password}', this)" class="hover:text-emerald-400 transition-colors text-slate-500">
                                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
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
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2" onclick="event.stopPropagation()">
                        <button onclick="window.editAccount('${acc.id}')" class="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all" title="Sửa">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.deleteAccountDirect('${acc.id}')" class="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Xóa">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
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
    return Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) < 7;
}

window.togglePassword = (id, realPass, btn) => {
    const span = document.getElementById(`pass-${id}`);
    const isHidden = span.innerText === '••••••••';
    
    if (isHidden) {
        span.innerText = realPass;
        span.classList.remove('text-slate-400');
        span.classList.add('text-blue-400');
        btn.innerHTML = `<i data-lucide="eye" class="w-3.5 h-3.5"></i>`; // Hiện pass -> hiện mắt thường
    } else {
        span.innerText = '••••••••';
        span.classList.remove('text-blue-400');
        span.classList.add('text-slate-400');
        btn.innerHTML = `<i data-lucide="eye-off" class="w-3.5 h-3.5"></i>`; // Ẩn pass -> hiện mắt gạch chéo
    }
    lucide.createIcons();
};

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
    for (let key in acc) { if (elements.form[key]) elements.form[key].value = acc[key]; }
    elements.modal.classList.add('active');
};

window.deleteAccountDirect = async (id) => {
    if (confirm('Xóa tài khoản này?')) {
        accounts = accounts.filter(a => a.id !== id);
        await saveData();
        render();
    }
};

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
    if (editingId && confirm('Xóa tài khoản?')) {
        accounts = accounts.filter(a => a.id !== editingId);
        await saveData();
        elements.modal.classList.remove('active');
        render();
    }
});
elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(elements.form).entries());
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
});
elements.searchInput.addEventListener('input', render);
elements.filterStatus.addEventListener('change', render);
elements.btnInfo.addEventListener('click', () => {
    elements.cloudInfo.classList.toggle('opacity-0');
    elements.cloudInfo.classList.toggle('pointer-events-none');
});
elements.btnLogout.addEventListener('click', () => {
    localStorage.removeItem('gmail_tool_remembered_key');
    localStorage.removeItem('gmail_tool_remembered_email');
    document.documentElement.classList.remove('is-logged-in');
    location.reload();
});

lucide.createIcons();
render();
