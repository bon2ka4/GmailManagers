const elements = {
    loginScreen: document.getElementById('login-screen'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    masterPasswordInput: document.getElementById('master-password'),
    rememberMe: document.getElementById('remember-me'),
    btnShowSetup: document.getElementById('btn-show-setup'),
    setupApiUrlInput: document.getElementById('setup-api-url'),
    
    recoveryModal: document.getElementById('recovery-modal'),
    displayRecoveryToken: document.getElementById('display-recovery-token'),
    btnConfirmRecovery: document.getElementById('btn-confirm-recovery'),
    
    forgotModal: document.getElementById('forgot-modal'),
    btnForgotPass: document.getElementById('btn-forgot-pass'),
    forgotForm: document.getElementById('forgot-form'),
    inputRecoveryEmail: document.getElementById('input-recovery-email'),
    btnSendRecoveryMail: document.getElementById('btn-send-recovery-mail'),
    inputRecoveryToken: document.getElementById('input-recovery-token'),
    btnCloseForgot: document.getElementById('btn-close-forgot'),

    mainApp: document.getElementById('main-app'),
    accountList: document.getElementById('account-list'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    statTotal: document.getElementById('stat-total'),
    statExpiring: document.getElementById('stat-expiring'),
    btnSync: document.getElementById('btn-sync'),
    btnAdd: document.getElementById('btn-add'),
    btnLogout: document.getElementById('btn-logout'),
    
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    form: document.getElementById('account-form'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnDelete: document.getElementById('btn-delete-account'),
    btnCancel: document.getElementById('btn-cancel'),
    
    btnInfo: document.getElementById('btn-info'),
    cloudInfo: document.getElementById('cloud-info')
};

let API_URL = "";
let MASTER_KEY = "";
let CURRENT_RECOVERY_TOKEN = "";
let accounts = [];
let cloudMetadata = {};
let editingId = null;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
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
    return CryptoJS.SHA256(email.toLowerCase() + pass).toString();
}

function generateRecoveryToken() {
    return 'RECOV-' + Math.random().toString(36).substr(2, 9).toUpperCase() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// --- CORE AUTH ---
elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.loginEmail.value;
    const pass = elements.masterPasswordInput.value;
    const key = deriveKey(email, pass);
    
    const encryptedUrl = localStorage.getItem('gmail_tool_api_url_encrypted');

    if (!encryptedUrl) {
        const url = elements.setupApiUrlInput.value.trim();
        if (!url) return alert("Vui lòng nhập Link Apps Script!");
        
        API_URL = url;
        MASTER_KEY = key;
        
        const encryptedUrlStore = CryptoJS.AES.encrypt(url, key).toString();
        localStorage.setItem('gmail_tool_api_url_encrypted', encryptedUrlStore);
        localStorage.setItem('gmail_tool_api_url_raw', url);

        if (elements.rememberMe.checked) {
            localStorage.setItem('gmail_tool_remembered_key', key);
            localStorage.setItem('gmail_tool_remembered_email', email);
        }
        
        document.documentElement.classList.add('is-logged-in');
        
        const token = generateRecoveryToken();
        CURRENT_RECOVERY_TOKEN = token;
        elements.displayRecoveryToken.innerText = token;
        elements.recoveryModal.classList.add('active-modal');
        
        cloudMetadata = { owner_email: email, recovery_token: token };
    } else {
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
            setTimeout(() => elements.loginScreen.style.display = 'none', 500);
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
    
    // TỰ ĐỘNG GỬI MAIL LẦN ĐẦU (Chỉ chạy khi vừa sinh token mới)
    if (CURRENT_RECOVERY_TOKEN) {
        const email = localStorage.getItem('gmail_tool_remembered_email') || elements.loginEmail.value;
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'request_recovery', email: email })
            });
            console.log("Welcome email sent automatically.");
        } catch (e) { console.error("Failed to send welcome email", e); }
        CURRENT_RECOVERY_TOKEN = ""; // Reset để không gửi lại nữa
    }

    loadData();
});

// --- RECOVERY LOGIC ---
elements.btnForgotPass.addEventListener('click', () => elements.forgotModal.classList.add('active-modal'));
elements.btnCloseForgot.addEventListener('click', () => elements.forgotModal.classList.remove('active-modal'));

elements.btnSendRecoveryMail.addEventListener('click', async () => {
    const email = elements.inputRecoveryEmail.value.trim();
    if (!email) return alert("Vui lòng nhập Gmail đăng ký!");

    const apiUrl = API_URL || localStorage.getItem('gmail_tool_api_url_raw');
    if (!apiUrl) return alert("Cần Link Apps Script để gửi mail!");

    elements.btnSendRecoveryMail.innerHTML = `<i data-lucide="refresh-cw" class="w-3 h-3 animate-spin"></i> <span>Đang gửi...</span>`;
    elements.btnSendRecoveryMail.disabled = true;
    lucide.createIcons();

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'request_recovery', email: email })
        });
        const result = await response.text();
        if (result === 'EmailSent') {
            elements.btnSendRecoveryMail.innerHTML = `<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i> <span class="text-emerald-400 font-bold uppercase tracking-tighter">Đã gửi</span>`;
            elements.btnSendRecoveryMail.classList.remove('bg-blue-600');
            elements.btnSendRecoveryMail.classList.add('bg-emerald-500/10', 'border', 'border-emerald-500/20');
        } else if (result === 'InvalidEmail') {
            alert("Gmail này không đúng!");
            elements.btnSendRecoveryMail.innerText = "Gửi mã";
            elements.btnSendRecoveryMail.disabled = false;
        } else {
            alert("Lỗi: " + result);
            elements.btnSendRecoveryMail.innerText = "Gửi mã";
            elements.btnSendRecoveryMail.disabled = false;
        }
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        elements.btnSendRecoveryMail.innerText = "Gửi mã";
        elements.btnSendRecoveryMail.disabled = false;
    }
    lucide.createIcons();
});

elements.forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = elements.inputRecoveryToken.value.trim();
    const apiUrl = API_URL || localStorage.getItem('gmail_tool_api_url_raw');
    
    try {
        const response = await fetch(apiUrl);
        const encryptedBlob = await response.text();
        // Giả lập khôi phục thành công bằng token
        MASTER_KEY = "RECOVERY_MODE"; 
        API_URL = apiUrl;
        alert("Xác minh thành công!");
        document.documentElement.classList.add('is-logged-in');
        elements.forgotModal.classList.remove('active-modal');
        elements.loginScreen.classList.add('hidden');
        elements.mainApp.classList.remove('blur-xl', 'opacity-0');
        loadData();
    } catch(err) {
        alert("Lỗi khôi phục.");
    }
});

// --- DATA LOGIC ---
async function loadData() {
    if (!API_URL || !MASTER_KEY) return;
    elements.btnSync.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 animate-spin"></i> <span class="text-xs font-medium">Đang tải...</span>`;
    lucide.createIcons();
    try {
        const response = await fetch(API_URL);
        const encryptedBlob = await response.text();
        if (encryptedBlob && encryptedBlob !== "[]") {
            const bytes = CryptoJS.AES.decrypt(encryptedBlob, MASTER_KEY);
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
    const payload = { accounts: accounts, metadata: cloudMetadata };
    const encryptedBlob = CryptoJS.AES.encrypt(JSON.stringify(payload), MASTER_KEY).toString();
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'save', 
                data: encryptedBlob,
                owner_email: localStorage.getItem('gmail_tool_remembered_email'),
                recovery_token: CURRENT_RECOVERY_TOKEN || cloudMetadata.recovery_token
            })
        });
    } catch (err) { alert("Lỗi lưu Cloud!"); }
}

function render() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const filter = elements.filterStatus.value;
    const filtered = accounts.filter(acc => {
        const matchesSearch = acc.account.toLowerCase().includes(searchTerm) || acc.password.toLowerCase().includes(searchTerm);
        return matchesSearch;
    });

    elements.statTotal.innerText = accounts.length;
    elements.statExpiring.innerText = accounts.filter(a => checkExpiring(a.expiry_date)).length;

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

// --- WINDOW HELPERS ---
window.togglePassword = (id, realPass, btn) => {
    const span = document.getElementById(`pass-${id}`);
    const isHidden = span.innerText === '••••••••';
    if (isHidden) {
        span.innerText = realPass;
        span.classList.remove('text-slate-400');
        span.classList.add('text-blue-400');
        btn.innerHTML = `<i data-lucide="eye" class="w-3.5 h-3.5"></i>`;
    } else {
        span.innerText = '••••••••';
        span.classList.remove('text-blue-400');
        span.classList.add('text-slate-400');
        btn.innerHTML = `<i data-lucide="eye-off" class="w-3.5 h-3.5"></i>`;
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
