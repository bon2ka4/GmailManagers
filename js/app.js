const elements = {
    authScreen: document.getElementById('auth-screen'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    authForm: document.getElementById('auth-form'),
    authEmail: document.getElementById('auth-email'),
    otpSection: document.getElementById('otp-section'),
    authOtp: document.getElementById('auth-otp'),
    btnAuthAction: document.getElementById('btn-auth-action'),
    rememberMe: document.getElementById('remember-me'),
    btnResetSetup: document.getElementById('btn-reset-setup'),

    mainApp: document.getElementById('main-app'),
    userDisplay: document.getElementById('user-display'),
    btnAdminPanel: document.getElementById('btn-admin-panel'),
    btnSync: document.getElementById('btn-sync'),
    btnLogout: document.getElementById('btn-logout'),
    syncScreen: document.getElementById('sync-screen'),
    
    statTotal: document.getElementById('stat-total'),
    statExpiring: document.getElementById('stat-expiring'),
    searchInput: document.getElementById('search-input'),
    accountList: document.getElementById('account-list'),
    emptyState: document.getElementById('empty-state'),
    btnAdd: document.getElementById('btn-add'),

    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    form: document.getElementById('account-form'),
    btnDelete: document.getElementById('btn-delete-account'),
    btnCancel: document.getElementById('btn-cancel'),

    adminModal: document.getElementById('admin-modal'),
    adminUserList: document.getElementById('admin-user-list'),
    btnCloseAdmin: document.getElementById('btn-close-admin'),

    setupModal: document.getElementById('setup-modal'),
    setupApiUrl: document.getElementById('setup-api-url'),
    btnSaveSetup: document.getElementById('btn-save-setup')
};

let API_URL = localStorage.getItem('gmail_tool_api_url') || "";
let CURRENT_USER = localStorage.getItem('gmail_tool_user') || "";
let IS_ADMIN = false;
let accounts = [];
let authMode = "login"; // login or register
let isOtpSent = false;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    if (!API_URL) {
        elements.setupModal.classList.remove('hidden');
    } else {
        // Dùng sessionStorage để tự xóa khi đóng trình duyệt
        const sessionUser = sessionStorage.getItem('gmail_tool_user');
        const isSessionActive = sessionStorage.getItem('gmail_tool_session_active') === 'true';
        
        if (sessionUser && isSessionActive) {
            CURRENT_USER = sessionUser;
            IS_ADMIN = sessionStorage.getItem('gmail_tool_is_admin') === 'true';
            
            // Lấy data từ cache local trước cho nhanh
            const cachedData = localStorage.getItem('gmail_tool_last_data_' + CURRENT_USER);
            accounts = cachedData ? JSON.parse(cachedData) : [];
            
            enterApp();
        }
    }
});

// --- AUTH LOGIC ---

elements.tabLogin.addEventListener('click', () => switchAuthMode("login"));
elements.tabRegister.addEventListener('click', () => switchAuthMode("register"));

function switchAuthMode(mode) {
    authMode = mode;
    isOtpSent = false;
    elements.otpSection.classList.add('hidden');
    elements.authTitle.innerText = mode === "login" ? "ĐĂNG NHẬP" : "ĐĂNG KÝ";
    elements.authSubtitle.innerText = mode === "login" ? "Dùng OTP để bảo mật tuyệt đối" : "Tham gia hệ thống quản lý Gmail";
    elements.btnAuthAction.querySelector('span').innerText = mode === "login" ? "GỬI MÃ OTP" : "ĐĂNG KÝ NGAY";
    
    elements.tabLogin.className = mode === "login" ? "flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white transition-all" : "flex-1 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all";
    elements.tabRegister.className = mode === "register" ? "flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white transition-all" : "flex-1 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all";
}

elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.authEmail.value.trim();
    
    if (authMode === "register") {
        await handleRegister(email);
    } else {
        if (!isOtpSent) {
            await handleRequestOtp(email);
        } else {
            await handleVerifyLogin(email, elements.authOtp.value.trim());
        }
    }
});

async function handleRegister(email) {
    elements.btnAuthAction.disabled = true;
    elements.btnAuthAction.querySelector('span').innerText = "ĐANG ĐĂNG KÝ...";
    
    try {
        const res = await callCloud({ action: 'register', email });
        if (res === "Success") {
            alert("Đăng ký thành công! Giờ Đại Ca hãy Đăng nhập nhé.");
            switchAuthMode("login");
        } else if (res === "AlreadyRegistered") {
            alert("Gmail này đã đăng ký rồi Đại Ca ơi!");
        } else {
            alert("Lỗi: " + res);
        }
    } catch (err) { alert("Lỗi kết nối: " + err.message); }
    finally { 
        elements.btnAuthAction.disabled = false;
        elements.btnAuthAction.querySelector('span').innerText = "ĐĂNG KÝ NGAY";
    }
}

async function handleRequestOtp(email) {
    elements.btnAuthAction.disabled = true;
    elements.btnAuthAction.querySelector('span').innerText = "ĐANG GỬI OTP...";
    
    try {
        const res = await callCloud({ action: 'request_otp', email });
        if (res === "OTPSent") {
            isOtpSent = true;
            elements.otpSection.classList.remove('hidden');
            elements.btnAuthAction.querySelector('span').innerText = "XÁC MINH & ĐĂNG NHẬP";
            elements.btnAuthAction.disabled = false;
        } else if (res === "NotRegistered") {
            alert("Gmail chưa đăng ký. Đại Ca sang tab Register nhé!");
        } else { alert("Lỗi: " + res); }
    } catch (err) { alert("Lỗi kết nối: " + err.message); }
    finally { if(!isOtpSent) elements.btnAuthAction.disabled = false; }
}

async function handleVerifyLogin(email, otp) {
    if (!otp) return alert("Vui lòng nhập mã OTP!");
    elements.btnAuthAction.disabled = true;
    elements.btnAuthAction.querySelector('span').innerText = "ĐANG XÁC MINH...";

    try {
        const res = await callCloud({ action: 'login', email, otp });
        if (res.status === "Success") {
            CURRENT_USER = email;
            IS_ADMIN = res.isAdmin;
            
            if (elements.rememberMe.checked) {
                sessionStorage.setItem('gmail_tool_user', email);
                sessionStorage.setItem('gmail_tool_otp', otp); // Lưu lại mã để Sync
                sessionStorage.setItem('gmail_tool_session_active', 'true');
                sessionStorage.setItem('gmail_tool_is_admin', IS_ADMIN);
                localStorage.setItem('gmail_tool_last_data_' + email, res.data || "[]");
            }
            
            accounts = res.data ? JSON.parse(res.data) : [];
            enterApp();
        } else {
            alert("Mã OTP không đúng hoặc đã hết hạn!");
        }
    } catch (err) { alert("Lỗi xác minh: " + err.message); }
    finally { elements.btnAuthAction.disabled = false; }
}

function enterApp() {
    elements.authScreen.classList.add('hidden');
    elements.syncScreen.classList.remove('hidden'); // Hiện màn hình chờ
    elements.userDisplay.innerHTML = `Chào Đại Ca, <span class="text-blue-400 font-bold">${CURRENT_USER}</span>`;
    
    if (IS_ADMIN) elements.btnAdminPanel.classList.remove('hidden');
    else elements.btnAdminPanel.classList.add('hidden');
    
    loadData(); // Bắt đầu đồng bộ
}

// --- DATA LOGIC ---

async function callCloud(payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch(e) { return text; }
}

async function loadData() {
    try {
        const storedOtp = sessionStorage.getItem('gmail_tool_otp') || "EXPIRED";
        const res = await callCloud({ action: 'login', email: CURRENT_USER, otp: storedOtp });
        
        if (res.status === "Success") {
            accounts = res.data ? JSON.parse(res.data) : [];
            localStorage.setItem('gmail_tool_last_data_' + CURRENT_USER, JSON.stringify(accounts));
            render();
            
            // Sync xong thì mới vào main app
            elements.syncScreen.classList.add('hidden');
            elements.mainApp.classList.remove('hidden');
        } else {
            alert("Phiên làm việc hết hạn. Vui lòng đăng nhập lại!");
            elements.btnLogout.click();
        }
    } catch (e) { 
        alert("Lỗi đồng bộ dữ liệu. Đại Ca kiểm tra lại mạng nhé!");
    }
}

async function saveData() {
    try {
        await callCloud({ action: 'save', email: CURRENT_USER, data: JSON.stringify(accounts) });
        // Luôn cache lại bản mới nhất để F5 phát có luôn
        localStorage.setItem('gmail_tool_last_data_' + CURRENT_USER, JSON.stringify(accounts));
    } catch (e) { alert("Lỗi lưu Cloud!"); }
}

function render() {
    const term = elements.searchInput.value.toLowerCase();
    const filtered = accounts.filter(a => a.account.toLowerCase().includes(term) || a.password.toLowerCase().includes(term));
    
    elements.statTotal.innerText = accounts.length;
    elements.statExpiring.innerText = accounts.filter(a => checkExpiring(a.expiry_date)).length;

    if (filtered.length === 0) {
        elements.accountList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
        elements.accountList.innerHTML = filtered.map(acc => `
            <tr class="admin-row transition-all cursor-pointer group" onclick="window.editAccount('${acc.id}')">
                <td class="px-6 py-4">
                    <div class="font-bold text-white">${acc.account}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span id="pass-${acc.id}" class="text-xs font-mono text-slate-500">••••••••</span>
                        <button onclick="event.stopPropagation(); window.togglePassword('${acc.id}', '${acc.password}', this)" class="text-slate-600 hover:text-blue-400"><i data-lucide="eye-off" class="w-3 h-3"></i></button>
                    </div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-400">
                    <div>${acc.phone || 'N/A'}</div>
                    <div class="text-[10px] opacity-50">${acc.recovery_email || ''}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs font-bold text-slate-300">${acc.storage_total || 15} GB</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-black ${checkExpiring(acc.expiry_date) ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}">
                        ${acc.expiry_date || 'VĨNH VIỄN'}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2" onclick="event.stopPropagation()">
                        <button onclick="window.editAccount('${acc.id}')" class="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="window.deleteAccount('${acc.id}')" class="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }
}

function checkExpiring(date) {
    if(!date) return false;
    const diff = (new Date(date) - new Date()) / (1000*60*60*24);
    return diff >= 0 && diff < 7;
}

// --- ADMIN PANEL ---

elements.btnAdminPanel.addEventListener('click', async () => {
    elements.adminModal.classList.add('active-modal');
    elements.adminUserList.innerHTML = `<tr><td colspan="4" class="p-10 text-center animate-pulse">Đang tải danh sách người dùng...</td></tr>`;
    
    try {
        const users = await callCloud({ action: 'admin_get_users', admin_email: CURRENT_USER });
        elements.adminUserList.innerHTML = users.map(u => `
            <tr class="border-b border-white/5 admin-row transition-all">
                <td class="px-6 py-4 font-medium">${u.email} ${u.email === CURRENT_USER ? '<span class="text-[10px] bg-amber-500 text-black px-1 rounded ml-1">ADMIN</span>' : ''}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${new Date(u.joinDate).toLocaleDateString('vi-VN')}</td>
                <td class="px-6 py-4"><span class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">${u.status}</span></td>
                <td class="px-6 py-4 text-center">
                    ${u.email !== CURRENT_USER ? `<button onclick="window.adminDeleteUser('${u.email}')" class="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><i data-lucide="user-minus" class="w-5 h-5"></i></button>` : '-'}
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    } catch (e) { alert("Lỗi tải danh sách admin!"); }
});

window.adminDeleteUser = async (targetEmail) => {
    if (confirm(`Đại Ca có chắc muốn XÓA VĨNH VIỄN người dùng ${targetEmail}? Toàn bộ dữ liệu của họ sẽ mất sạch!`)) {
        try {
            await callCloud({ action: 'admin_delete_user', admin_email: CURRENT_USER, target_email: targetEmail });
            alert("Đã xóa user thành công!");
            elements.btnAdminPanel.click(); // Reload
        } catch (e) { alert("Lỗi khi xóa!"); }
    }
};

elements.btnCloseAdmin.addEventListener('click', () => elements.adminModal.classList.remove('active-modal'));

// --- APP ACTIONS ---

window.togglePassword = (id, pass, btn) => {
    const span = document.getElementById(`pass-${id}`);
    const isHidden = span.innerText === '••••••••';
    span.innerText = isHidden ? pass : '••••••••';
    span.classList.toggle('text-blue-400', isHidden);
    btn.innerHTML = `<i data-lucide="${isHidden ? 'eye' : 'eye-off'}" class="w-3 h-3"></i>`;
    lucide.createIcons();
};

window.editAccount = (id) => {
    const acc = accounts.find(a => a.id === id);
    editingId = id;
    elements.modalTitle.innerText = "CHỈNH SỬA TÀI KHOẢN";
    elements.btnDelete.classList.remove('hidden');
    for (let key in acc) { if (elements.form[key]) elements.form[key].value = acc[key]; }
    elements.modal.classList.add('active-modal');
};

window.deleteAccount = async (id) => {
    if (confirm("Xóa tài khoản này nhé Đại Ca?")) {
        accounts = accounts.filter(a => a.id !== id);
        await saveData();
        render();
    }
};

elements.btnAdd.addEventListener('click', () => {
    editingId = null;
    elements.form.reset();
    elements.modalTitle.innerText = "THÊM TÀI KHOẢN MỚI";
    elements.btnDelete.classList.add('hidden');
    elements.modal.classList.add('active-modal');
});

elements.btnCancel.addEventListener('click', () => elements.modal.classList.remove('active-modal'));
elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(elements.form).entries());
    if (editingId) {
        const idx = accounts.findIndex(a => a.id === editingId);
        accounts[idx] = { ...accounts[idx], ...data };
    } else {
        data.id = Date.now().toString();
        accounts.push(data);
    }
    await saveData();
    elements.modal.classList.remove('active-modal');
    render();
});

elements.searchInput.addEventListener('input', render);

elements.btnLogout.addEventListener('click', () => {
    // Xóa sạch mọi dấu vết
    sessionStorage.clear();
    localStorage.removeItem('gmail_tool_user');
    
    // Ép quay về trang chủ (xóa bỏ cả query string nếu có)
    window.location.href = window.location.origin + window.location.pathname;
});

// --- CLOUD SETUP ---
elements.btnSaveSetup.addEventListener('click', () => {
    const url = elements.setupApiUrl.value.trim();
    if (url) {
        API_URL = url;
        localStorage.setItem('gmail_tool_api_url', url);
        elements.setupModal.classList.add('hidden');
        alert("Cấu hình Cloud thành công!");
    }
});

elements.btnResetSetup.addEventListener('click', () => {
    if (confirm("Cấu hình lại toàn bộ hệ thống?")) {
        localStorage.clear();
        location.reload();
    }
});
