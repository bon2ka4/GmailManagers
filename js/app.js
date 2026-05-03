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
    statValid: document.getElementById('stat-valid'),
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
    btnSaveSetup: document.getElementById('btn-save-setup'),
    globalLoading: document.getElementById('global-loading')
};

function toggleLoading(show) {
    if (!elements.globalLoading) return;
    if (show) elements.globalLoading.classList.remove('hidden');
    else elements.globalLoading.classList.add('hidden');
}

let API_URL = localStorage.getItem('gmail_tool_api_url') || "";

let CURRENT_USER = localStorage.getItem('gmail_tool_user') || "";
let IS_ADMIN = sessionStorage.getItem('gmail_tool_is_admin') === 'true';
let accounts = [];
let authMode = "login"; // login or register
let isOtpSent = false;
let editingId = null;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();

    // Thêm logic tự động chèn dấu gạch cho ô ngày
    document.querySelectorAll('.date-mask').forEach(input => {
        input.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 8) v = v.substring(0, 8);
            if (v.length > 4) v = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4);
            else if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
            e.target.value = v;
        });
    });

    if (!API_URL) {
        elements.setupModal.classList.remove('hidden');
    } else {
        const isSessionActive = sessionStorage.getItem('gmail_tool_session_active') === 'true';
        if (isSessionActive) {
            IS_ADMIN = sessionStorage.getItem('gmail_tool_is_admin') === 'true';
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

    elements.tabLogin.className = mode === "login" ? "flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white transition-all cursor-pointer" : "flex-1 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all cursor-pointer";
    elements.tabRegister.className = mode === "register" ? "flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white transition-all cursor-pointer" : "flex-1 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all cursor-pointer";
    resetAuthButton();
}

elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.authEmail.value.trim();
    if (!email) return;

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

function setAuthBtnState(text, isLoading = false, iconName = "arrow-right") {
    if (!elements.btnAuthAction) return;
    elements.btnAuthAction.disabled = isLoading;
    elements.btnAuthAction.innerHTML = `<span>${text}</span> <i data-lucide="${iconName}" class="w-5 h-5 ${isLoading ? 'animate-spin' : ''}"></i>`;
    if (window.lucide) lucide.createIcons();
}

async function handleRegister(email) {
    setAuthBtnState("ĐANG ĐĂNG KÝ...", true, "refresh-cw");
    try {
        const res = await callCloud({ action: 'register', email });
        if (res === "Success") {
            authMode = "login";
            await handleRequestOtp(email);
        } else if (res === "AlreadyRegistered") {
            resetAuthButton();
            alert("Gmail này đã đăng ký rồi Đại Ca ơi!");
            switchAuthMode("login");
        } else {
            resetAuthButton();
            alert("Lỗi: " + res);
        }
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        resetAuthButton();
    }
}

async function handleRequestOtp(email) {
    setAuthBtnState("ĐANG GỬI OTP...", true, "refresh-cw");
    try {
        const res = await callCloud({ action: 'request_otp', email });
        if (res === "OTPSent") {
            isOtpSent = true;
            elements.otpSection.classList.remove('hidden');
            setAuthBtnState("XÁC MINH & ĐĂNG NHẬP", false, "check-circle");
        } else if (res === "NotRegistered") {
            resetAuthButton();
            alert("Gmail chưa đăng ký. Đại Ca sang tab Register nhé!");
        } else {
            resetAuthButton();
            alert("Lỗi: " + res);
        }
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
        resetAuthButton();
    }
}

function resetAuthButton() {
    setAuthBtnState(authMode === "login" ? "GỬI MÃ OTP" : "ĐĂNG KÝ NGAY", false, "arrow-right");
}

async function handleVerifyLogin(email, otp) {
    if (!otp) return alert("Vui lòng nhập mã OTP!");
    setAuthBtnState("ĐANG XÁC MINH...", true, "refresh-cw");

    try {
        const res = await callCloud({ action: 'login', email, otp });
        if (res.status === "Success") {
            CURRENT_USER = email;
            IS_ADMIN = res.isAdmin;
            sessionStorage.setItem('gmail_tool_user', email);
            sessionStorage.setItem('gmail_tool_otp', otp);
            sessionStorage.setItem('gmail_tool_session_active', 'true');
            sessionStorage.setItem('gmail_tool_is_admin', IS_ADMIN);

            if (elements.rememberMe.checked) localStorage.setItem('gmail_tool_user', email);
            localStorage.setItem('gmail_tool_last_data_' + email, res.data || "[]");

            accounts = res.data ? JSON.parse(res.data) : [];
            enterApp();
        } else {
            alert("Mã OTP không đúng hoặc đã hết hạn!");
            setAuthBtnState("XÁC MINH & ĐĂNG NHẬP", false, "check-circle");
        }
    } catch (err) {
        alert("Lỗi xác minh: " + err.message);
        resetAuthButton();
    }
}

function enterApp() {
    elements.authScreen.classList.add('hidden');
    elements.syncScreen.classList.remove('hidden');
    elements.userDisplay.innerHTML = `Chào Đại Ca, <span class="text-blue-400 font-bold">${CURRENT_USER}</span>`;

    // MASTER OVERRIDE: Đại Ca luôn là Admin
    if (CURRENT_USER === "bon1998.canhan@gmail.com") {
        IS_ADMIN = true;
        sessionStorage.setItem('gmail_tool_is_admin', 'true');
    }

    if (IS_ADMIN) {
        elements.btnAdminPanel.classList.remove('hidden');
        console.log("Admin Panel Activated for:", CURRENT_USER);
    } else {
        elements.btnAdminPanel.classList.add('hidden');
    }
    loadData();
}

// --- DATA LOGIC ---
async function callCloud(payload) {
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const text = await response.text();
    try { return JSON.parse(text); } catch (e) { return text; }
}

async function loadData() {
    try {
        const storedOtp = sessionStorage.getItem('gmail_tool_otp') || "EXPIRED";
        const res = await callCloud({ action: 'login', email: CURRENT_USER, otp: storedOtp });
        if (res.status === "Success") {
            accounts = JSON.parse(res.data || "[]");
            localStorage.setItem('gmail_tool_last_data_' + CURRENT_USER, JSON.stringify(accounts));
            render();
            elements.syncScreen.classList.add('hidden');
            elements.mainApp.classList.remove('hidden');
        } else {
            elements.syncScreen.classList.add('hidden');
            elements.mainApp.classList.remove('hidden');
            render();
        }
    } catch (e) { alert("Lỗi đồng bộ dữ liệu!"); }
}

async function saveData() {
    try {
        await callCloud({ action: 'save', email: CURRENT_USER, data: JSON.stringify(accounts) });
        localStorage.setItem('gmail_tool_last_data_' + CURRENT_USER, JSON.stringify(accounts));
    } catch (e) { alert("Lỗi lưu Cloud!"); }
}

function render() {
    const term = elements.searchInput.value.toLowerCase();
    const filtered = accounts.filter(a => a.account.toLowerCase().includes(term) || a.password.toLowerCase().includes(term));
    elements.statTotal.innerText = accounts.length;
    elements.statExpiring.innerText = accounts.filter(a => isOverdue(a.expiry_date)).length;
    elements.statValid.innerText = accounts.filter(a => a.burial_date && a.expiry_date && a.burial_date < a.expiry_date).length;

    if (filtered.length === 0) {
        elements.accountList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
        elements.accountList.innerHTML = filtered.map((acc, index) => {
            const isViolation = acc.burial_date && acc.expiry_date && acc.burial_date >= acc.expiry_date;
            const overdue = isOverdue(acc.expiry_date);

            return `
            <tr class="admin-row transition-all group border-b border-white/5 hover:bg-white/[0.02] ${isViolation ? 'bg-rose-500/10 border-l-2 border-l-rose-500' : ''}">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2 group/item">
                        <div class="font-bold text-white">${acc.account}</div>
                        <button onclick="event.stopPropagation(); window.copyText('${acc.account}', 'Gmail')" class="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-blue-400 transition-all"><i data-lucide="copy" class="w-3 h-3"></i></button>
                    </div>
                    <div class="flex items-center gap-2 mt-1 group/item">
                        <span id="pass-${acc.id}" class="text-xs font-mono text-slate-500">••••••••</span>
                        <button onclick="event.stopPropagation(); window.togglePassword('${acc.id}', '${acc.password}', this)" class="text-slate-600 hover:text-blue-400"><i data-lucide="eye-off" class="w-3 h-3"></i></button>
                        <button onclick="event.stopPropagation(); window.copyText('${acc.password}', 'Mật khẩu')" class="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-blue-400 transition-all"><i data-lucide="copy" class="w-3 h-3"></i></button>
                    </div>
                </td>
                <td class="px-6 py-4 text-xs text-slate-400">
                    <div class="flex items-center gap-2 group/item">
                        <span>${acc.phone || 'N/A'}</span>
                        ${acc.phone ? `<button onclick="event.stopPropagation(); window.copyText('${acc.phone}', 'SĐT')" class="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-emerald-400 transition-all"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-[10px] opacity-50 group/item">
                        <span>${acc.recovery_email || ''}</span>
                        ${acc.recovery_email ? `<button onclick="event.stopPropagation(); window.copyText('${acc.recovery_email}', 'Mail khôi phục')" class="opacity-0 group-hover/item:opacity-100 text-slate-500 hover:text-emerald-400 transition-all"><i data-lucide="copy" class="w-3 h-3"></i></button>` : ''}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="text-xs font-bold text-slate-300">${acc.storage_value || 15} ${acc.storage_unit || 'GB'}</span>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-black ${acc.burial_date ? 'bg-slate-500/10 text-slate-400' : 'bg-blue-500/10 text-blue-400'}">
                        ${acc.burial_date ? formatDate(acc.burial_date) : 'VĨNH VIỄN'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="px-2 py-1 rounded-lg text-[10px] font-black ${overdue ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-emerald-500/10 text-emerald-500'}">
                        ${acc.expiry_date ? formatDate(acc.expiry_date) : 'CHƯA CÀI ĐẶT'}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2" onclick="event.stopPropagation()">
                        <!-- Nút Di chuyển -->
                        <div class="flex flex-col gap-1 mr-2 border-r border-white/10 pr-2">
                            ${index > 0 ? `<button onclick="window.moveAccount('${acc.id}', -1)" class="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-500/20" title="Di chuyển lên"><i data-lucide="chevron-up" class="w-5 h-5"></i></button>` : '<div class="w-8 h-8"></div>'}
                            ${index < filtered.length - 1 ? `<button onclick="window.moveAccount('${acc.id}', 1)" class="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-500/20" title="Di chuyển xuống"><i data-lucide="chevron-down" class="w-5 h-5"></i></button>` : '<div class="w-8 h-8"></div>'}
                        </div>
                        <button onclick="window.editAccount('${acc.id}')" class="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="window.deleteAccount('${acc.id}')" class="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
        console.log("Dashboard Rendered with Violation Highlighting!");
        if (window.lucide) lucide.createIcons();
    }
}

function isOverdue(date) {
    if (!date) return true; // Không có ngày hết hạn = Coi như quá hạn (cần xử lý)
    const today = new Date().toISOString().split('T')[0];
    return date < today;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
}

window.moveAccount = async (id, direction) => {
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= accounts.length) return;

    // Tráo đổi vị trí trong mảng
    const temp = accounts[index];
    accounts[index] = accounts[newIndex];
    accounts[newIndex] = temp;

    toggleLoading(true);
    try {
        await saveData();
        render();
    } catch (e) {
        alert("Lỗi khi thay đổi thứ tự!");
    } finally {
        setTimeout(() => toggleLoading(false), 200);
    }
};

// --- ADMIN PANEL ---
elements.btnAdminPanel.addEventListener('click', async () => {
    elements.adminModal.classList.add('active-modal');
    elements.adminUserList.innerHTML = `<tr><td colspan="4" class="p-10 text-center animate-pulse">Đang tải...</td></tr>`;
    try {
        const users = await callCloud({ action: 'admin_get_users', admin_email: CURRENT_USER });
        elements.adminUserList.innerHTML = users.map(u => `
            <tr class="border-b border-white/5 admin-row transition-all">
                <td class="px-6 py-4 font-medium">${u.email} ${u.email === CURRENT_USER ? '<span class="text-[10px] bg-amber-500 text-black px-1 rounded ml-1">ADMIN</span>' : ''}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${new Date(u.joinDate).toLocaleDateString('vi-VN')}</td>
                <td class="px-6 py-4 text-center"><span class="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">${u.status}</span></td>
                <td class="px-6 py-4 text-center">
                    ${u.email !== CURRENT_USER ? `<button onclick="window.adminDeleteUser('${u.email}')" class="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><i data-lucide="user-minus" class="w-5 h-5"></i></button>` : '-'}
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    } catch (e) { alert("Lỗi Admin!"); }
});

window.adminDeleteUser = async (targetEmail) => {
    if (confirm("Xóa vĩnh viễn user này?")) {
        try {
            await callCloud({ action: 'admin_delete_user', admin_email: CURRENT_USER, target_email: targetEmail });
            alert("Đã xóa!");
            elements.btnAdminPanel.click();
        } catch (e) { alert("Lỗi!"); }
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
    if (window.lucide) lucide.createIcons();
};

window.copyText = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl z-[500] fade-in flex items-center gap-2 border border-white/20';
        toast.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> ĐÃ CHÉP ${label.toUpperCase()}!`;
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();
        setTimeout(() => toast.remove(), 2000);
    });
};

window.editAccount = (id) => {
    const acc = accounts.find(a => a.id === id);
    editingId = id;
    elements.modalTitle.innerText = "CHỈNH SỬA GMAIL";
    elements.btnDelete.classList.remove('hidden');

    for (let key in acc) {
        if (elements.form[key]) {
            let val = acc[key];
            // Nếu là trường ngày, format lại sang dd/mm/yyyy để hiện thị
            if ((key === 'expiry_date' || key === 'burial_date') && val) {
                val = formatDate(val);
            }
            elements.form[key].value = val;
        }
    }
    elements.modal.classList.add('active-modal');
};

elements.btnAdd.addEventListener('click', () => {
    editingId = null;
    elements.form.reset();
    elements.modalTitle.innerText = "THÊM GMAIL MỚI";
    elements.btnDelete.classList.add('hidden');
    elements.modal.classList.add('active-modal');
});

elements.btnCancel.addEventListener('click', () => elements.modal.classList.remove('active-modal'));

elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(true); // Hiện mờ toàn web
    try {
        const formData = new FormData(elements.form);
        const data = Object.fromEntries(formData.entries());

        // Chuyển đổi dd/mm/yyyy ngược lại yyyy-mm-dd trước khi lưu
        if (data.expiry_date) data.expiry_date = convertToISO(data.expiry_date);
        if (data.burial_date) data.burial_date = convertToISO(data.burial_date);

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
    } catch (err) {
        alert("Lỗi lưu dữ liệu!");
    } finally {
        // Tắt loading sau một khoảng trễ nhỏ để Đại Ca kịp thấy hiệu ứng mờ
        setTimeout(() => toggleLoading(false), 300);
    }
});

function convertToISO(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [d, m, y] = dateStr.split('/');
    if (!d || !m || !y) return dateStr;
    return `${y}-${m}-${d}`;
}

window.deleteAccount = async (id) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    if (confirm(`Đại Ca có chắc muốn XÓA Gmail: ${acc.account}?`)) {
        toggleLoading(true); // Hiện mờ toàn web
        try {
            accounts = accounts.filter(a => a.id !== id);
            await saveData();
            elements.modal.classList.remove('active-modal');
            render();
        } catch (err) {
            alert("Lỗi khi xóa!");
        } finally {
            setTimeout(() => toggleLoading(false), 300);
        }
    }
};

elements.searchInput.addEventListener('input', render);
elements.btnLogout.addEventListener('click', () => {
    sessionStorage.clear();
    localStorage.removeItem('gmail_tool_user');
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
    if (confirm("Reset lại toàn bộ?")) {
        localStorage.clear();
        location.reload();
    }
});
