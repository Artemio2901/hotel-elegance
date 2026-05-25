

// ── CONFIGURACIÓN DE LA API ──────────────────────────────────
const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://localhost:3000/api'
    : window.location.origin + '/api';
let apiAvailable = false;

// ── SERVICIO DE API ──────────────────────────────────────────
const ApiService = {
    async request(method, endpoint, body = null) {
        try {
            const opts = {
                method,
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(4000)
            };
            if (body) opts.body = JSON.stringify(body);
            const res = await fetch(`${API_BASE}${endpoint}`, opts);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error en la API');
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    },

    get: (ep) => ApiService.request('GET', ep),
    post: (ep, body) => ApiService.request('POST', ep, body),
    delete: (ep, body) => ApiService.request('DELETE', ep, body),

    async checkHealth() {
        const result = await ApiService.get('/health');
        return result.ok;
    },

    async login(username, password) {
        return ApiService.post('/auth/login', { username, password });
    },

    async register(payload) {
        return ApiService.post('/auth/register', payload);
    },

    async getRooms() {
        return ApiService.get('/rooms');
    },

    async getOffers() {
        return ApiService.get('/offers');
    },

    async createReservation(payload) {
        return ApiService.post('/reservations', payload);
    },

    async getUserReservations(username) {
        return ApiService.get(`/reservations/${username}`);
    },

    async cancelReservation(id, username) {
        return ApiService.delete(`/reservations/${id}`, { username });
    },

    async getAllReservations() {
        return ApiService.get('/reservations');
    },

    async updateReservation(id, payload) {
        return ApiService.request('PUT', `/reservations/${id}`, payload);
    },

    async getUsers() {
        return ApiService.get('/users');
    },

    async deleteUser(id) {
        return ApiService.request('DELETE', `/users/${id}`);
    },

    async updateRoom(id, payload) {
        return ApiService.request('PUT', `/rooms/${id}`, payload);
    },

    async deleteRoom(id) {
        return ApiService.request('DELETE', `/rooms/${id}`);
    }
};

// ── ESTADO DE LA APLICACIÓN ─────────────────────────────────
const AppState = {
    currentUser: null,
    isLoggedIn: false,
    userRole: null,
    selectedRoom: null,
    selectedOffer: null
};

// ── DATOS DE HABITACIONES (fallback) ────────────────────────
const ROOMS = [
    {
        id: 'suite-lujo',
        title: 'Suite de Lujo',
        price: 350,
        icon: '🛏️',
        features: ['King Size', '2-3 Personas', '65 m²', 'Vista al Mar'],
        description: 'Espaciosa suite con vista panorámica, jacuzzi privado y sala de estar elegante.'
    },
    {
        id: 'deluxe',
        title: 'Habitación Deluxe',
        price: 200,
        icon: '🛏️',
        features: ['Queen Size', '2 Personas', '40 m²', 'Vista Ciudad'],
        description: 'Habitación moderna con todas las comodidades y diseño contemporáneo.'
    },
    {
        id: 'estandar',
        title: 'Habitación Estándar',
        price: 120,
        icon: '🛏️',
        features: ['Full Size', '1-2 Personas', '30 m²', 'Vista Jardín'],
        description: 'Confortable y acogedora, perfecta para estancias cortas con todo lo necesario.'
    }
];

// ── DATOS DE OFERTAS (fallback) ──────────────────────────────
const OFFERS = [
    {
        id: 'romantica',
        title: 'Escapada Romántica',
        badge: '-30%',
        icon: '💑',
        description: 'La escapada perfecta para parejas que buscan una experiencia íntima e inolvidable.',
        includes: [
            '2 noches en Suite de Lujo',
            'Cena romántica con vista al mar',
            'Spa para parejas (2 horas)',
            'Botella de champagne de bienvenida',
            'Arreglo floral en la habitación'
        ],
        oldPrice: 700,
        newPrice: 490,
        validity: 'Válido todos los fines de semana del año'
    },
    {
        id: 'prolongada',
        title: 'Estadía Prolongada',
        badge: '-20%',
        icon: '📅',
        description: 'Aprovecha el mejor precio cuando te quedas 5 noches o más. Perfecto para viajeros de negocios o vacaciones largas.',
        includes: [
            '5 noches o más en habitación elegida',
            'Desayuno buffet incluido diariamente',
            'Lavandería gratuita (2 piezas/día)',
            'Acceso al gimnasio y piscina',
            'Transporte al aeropuerto (ida y vuelta)'
        ],
        oldPrice: 1000,
        newPrice: 800,
        validity: 'Válido para reservas de 5 noches o más'
    },
    {
        id: 'wellness',
        title: 'Experiencia Wellness',
        badge: 'Nuevo',
        icon: '🧘',
        description: 'Reconecta con tu bienestar en un retiro de lujo diseñado para relajar cuerpo y mente.',
        includes: [
            '3 noches en Habitación Deluxe',
            'Acceso ilimitado al spa',
            'Clases de yoga matutinas',
            'Menú saludable en restaurante',
            'Masaje relajante de 60 min (1 sesión)'
        ],
        oldPrice: null,
        newPrice: 650,
        validity: 'Disponible de lunes a jueves'
    }
];

// ── ELEMENTOS DEL DOM ────────────────────────────────────────
const el = {
    // Páginas
    loginPage: document.getElementById('login-page'),
    registerPage: document.getElementById('register-page'),
    dashboardPage: document.getElementById('dashboard-page'),

    // Login
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    rememberMeCheckbox: document.getElementById('remember-me'),
    signupLink: document.querySelector('.signup-link'),

    // Register
    registerForm: document.getElementById('register-form'),
    registerFullname: document.getElementById('register-fullname'),
    registerEmail: document.getElementById('register-email'),
    registerUsername: document.getElementById('register-username'),
    registerPassword: document.getElementById('register-password'),
    registerConfirmPassword: document.getElementById('register-confirm-password'),
    acceptTerms: document.getElementById('accept-terms'),
    backToLoginLink: document.getElementById('back-to-login'),

    // Dashboard nav
    logoutBtn: document.getElementById('logout-btn'),
    myReservationsBtn: document.getElementById('my-reservations-btn'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('.nav-link'),

    // Booking widget
    searchBtn: document.getElementById('search-btn'),
    checkInInput: document.getElementById('check-in'),
    checkOutInput: document.getElementById('check-out'),
    guestsInput: document.getElementById('guests'),

    // Room & offer buttons
    reserveButtons: document.querySelectorAll('.btn-reserve'),
    offerButtons: document.querySelectorAll('.btn-offer'),

    // Modales
    reservationModal: document.getElementById('reservation-modal'),
    offerModal: document.getElementById('offer-modal'),
    myReservationsModal: document.getElementById('my-reservations-modal'),
    confirmationModal: document.getElementById('confirmation-modal'),
    termsModal: document.getElementById('terms-modal'),

    // Reservation form
    reservationForm: document.getElementById('reservation-form'),
    resCheckin: document.getElementById('res-checkin'),
    resCheckout: document.getElementById('res-checkout'),
    resGuests: document.getElementById('res-guests'),
    resName: document.getElementById('res-name'),
    resEmail: document.getElementById('res-email'),
    resSpecial: document.getElementById('res-special'),
    modalRoomInfo: document.getElementById('modal-room-info'),
    priceSummary: document.getElementById('price-summary'),
    priceBreakdown: document.getElementById('price-breakdown'),

    // Offer modal
    offerModalIcon: document.getElementById('offer-modal-icon'),
    offerModalTitle: document.getElementById('offer-modal-title'),
    offerModalBadge: document.getElementById('offer-modal-badge'),
    offerModalBody: document.getElementById('offer-modal-body'),
    bookOfferBtn: document.getElementById('book-offer-btn'),

    // My reservations modal
    reservationsList: document.getElementById('reservations-list'),

    // Confirmation modal
    confirmationDetails: document.getElementById('confirmation-details'),
    viewReservationsBtn: document.getElementById('view-reservations-btn'),
    closeConfirmationBtn: document.getElementById('close-confirmation-btn'),

    // Grids
    roomsGrid: document.getElementById('dynamic-rooms-grid'),
    offersGrid: document.getElementById('dynamic-offers-grid'),

    // Links
    termsLink: document.querySelector('.terms-link'),

    // API status badge (se crea dinámicamente)
    apiStatusBadge: null
};

function createApiStatusBadge() {
    const badge = document.createElement('li');
    badge.id = 'api-status-badge';
    badge.innerHTML = `<span id="api-status-dot" class="api-dot api-dot--checking">⏳</span>
                       <span id="api-status-label">Verificando API...</span>`;
    badge.style.cssText = 'display:flex;align-items:center;gap:.4rem;font-size:.8rem;opacity:.8;';

    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.insertBefore(badge, navMenu.firstChild);
    }
    el.apiStatusBadge = badge;

    // Estilos para el badge
    const badgeStyle = document.createElement('style');
    badgeStyle.textContent = `
        #api-status-badge { cursor:default; }
        .api-dot { font-size:.9rem; }
        .api-dot--checking { opacity:.6; }
        #api-status-label { color: rgba(255,255,255,.85); font-weight:500; }
    `;
    document.head.appendChild(badgeStyle);
}

function updateApiStatusBadge(available) {
    const dot = document.getElementById('api-status-dot');
    const label = document.getElementById('api-status-label');
    if (!dot || !label) return;
    if (available) {
        dot.textContent = '🟢';
        label.textContent = 'API Conectada';
    } else {
        dot.textContent = '🟡';
        label.textContent = 'Modo Local';
    }
}

async function checkApiStatus() {
    const available = await ApiService.checkHealth();
    apiAvailable = available;
    updateApiStatusBadge(available);
    // Verificar cada 30 segundos
    setTimeout(checkApiStatus, 30000);
}

async function initializeApp() {
    const savedUser = localStorage.getItem('hotelUser');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedUser && rememberMe) {
        AppState.currentUser = savedUser;
        AppState.isLoggedIn = true;
        AppState.userRole = localStorage.getItem('hotelUserRole') || 'user';
        showDashboard();
    } else {
        showLogin();
    }

    setMinDates();
    attachEventListeners();
    attachAdminListeners();
    createApiStatusBadge();

    // Verificar disponibilidad de la API (sin bloquear el arranque)
    await checkApiStatus();
    await loadData();
}

async function loadData() {
    let rooms = [...ROOMS];
    let offers = [...OFFERS];
    if (apiAvailable) {
        const rRes = await ApiService.getRooms();
        if (rRes.ok && rRes.data.rooms) rooms = rRes.data.rooms;
        const oRes = await ApiService.getOffers();
        if (oRes.ok && oRes.data.offers) offers = oRes.data.offers;
    }
    renderRooms(rooms);
    renderOffers(offers);
}

function renderRooms(rooms) {
    if (!el.roomsGrid) return;
    el.roomsGrid.innerHTML = rooms.map(room => `
        <div class="room-card">
            <div class="room-image-placeholder">
                <span class="room-icon">${room.icon || '🛏️'}</span>
                ${room.badge ? `<span class="room-badge">${room.badge}</span>` : ''}
            </div>
            <div class="room-content">
                <h3 class="room-title">${room.title}</h3>
                <p class="room-price">Desde <strong>$${room.price}</strong> / noche</p>
                <div class="room-features">
                    ${(room.features || []).map(f => `<span>✓ ${f}</span>`).join('')}
                </div>
                <button class="btn-outline btn-reserve" data-id="${room.id}">Reservar Ahora</button>
            </div>
        </div>
    `).join('');

    el.reserveButtons = document.querySelectorAll('.btn-reserve');
    el.reserveButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const r = rooms.find(x => x.id === btn.dataset.id);
            if (r) openReservationModal(r);
        });
    });
}

function renderOffers(offers) {
    if (!el.offersGrid) return;
    el.offersGrid.innerHTML = offers.map(offer => `
        <div class="offer-card">
            <div class="offer-header">
                <span class="offer-icon">${offer.icon || '🎁'}</span>
                ${offer.badge ? `<span class="offer-badge">${offer.badge}</span>` : ''}
            </div>
            <h3 class="offer-title">${offer.title}</h3>
            <p class="offer-description">${offer.description}</p>
            <div class="offer-price">
                ${offer.oldPrice ? `<span class="old-price">$${offer.oldPrice}</span>` : ''}
                <span class="new-price">$${offer.newPrice}</span>
            </div>
            <button class="btn-primary btn-offer" data-id="${offer.id}">Ver Detalles</button>
        </div>
    `).join('');

    el.offerButtons = document.querySelectorAll('.btn-offer');
    el.offerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const o = offers.find(x => x.id === btn.dataset.id);
            if (o) openOfferModal(o);
        });
    });
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
function attachEventListeners() {
    // Auth
    el.loginForm.addEventListener('submit', handleLogin);
    el.registerForm.addEventListener('submit', handleRegister);
    el.signupLink.addEventListener('click', e => { e.preventDefault(); showRegister(); });
    el.backToLoginLink.addEventListener('click', e => { e.preventDefault(); showLogin(); });
    el.logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    el.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    el.navLinks.forEach(link => link.addEventListener('click', handleNavigation));
    el.myReservationsBtn.addEventListener('click', openMyReservations);

    // Booking
    el.searchBtn.addEventListener('click', handleSearch);

    // Links adicionales
    if (el.termsLink) {
        el.termsLink.addEventListener('click', e => {
            e.preventDefault();
            if (el.termsModal) openModal(el.termsModal);
        });
    }

    // Reservation form
    el.reservationForm.addEventListener('submit', handleReservationSubmit);
    el.resCheckin.addEventListener('change', updatePriceSummary);
    el.resCheckout.addEventListener('change', updatePriceSummary);

    // Close modals
    document.getElementById('close-reservation-modal').addEventListener('click', () => closeModal(el.reservationModal));
    document.getElementById('close-offer-modal').addEventListener('click', () => closeModal(el.offerModal));
    document.getElementById('close-my-reservations').addEventListener('click', () => closeModal(el.myReservationsModal));
    const closeTermsModalBtn = document.getElementById('close-terms-modal');
    if (closeTermsModalBtn) closeTermsModalBtn.addEventListener('click', () => closeModal(el.termsModal));
    const acceptTermsBtnModal = document.getElementById('accept-terms-btn-modal');
    if (acceptTermsBtnModal) {
        acceptTermsBtnModal.addEventListener('click', () => {
            closeModal(el.termsModal);
            if (el.acceptTerms) el.acceptTerms.checked = true;
        });
    }

    // Confirmation
    el.viewReservationsBtn.addEventListener('click', () => {
        closeModal(el.confirmationModal);
        openMyReservations();
    });
    el.closeConfirmationBtn.addEventListener('click', () => closeModal(el.confirmationModal));

    // Offer book
    el.bookOfferBtn.addEventListener('click', handleBookOffer);

    // Backdrop click
    [el.reservationModal, el.offerModal, el.myReservationsModal, el.confirmationModal, el.termsModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // Outside nav
    document.addEventListener('click', e => {
        if (!e.target.closest('.navbar') && el.navMenu.classList.contains('active')) {
            el.navMenu.classList.remove('active');
        }
    });

    // Placeholder links
    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', e => {
            if (!link.classList.contains('nav-link')) e.preventDefault();
        });
    });

    // ESC closes modals
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const allModals = [el.reservationModal, el.offerModal, el.myReservationsModal, el.confirmationModal, el.termsModal,
                document.getElementById('admin-panel-modal'), document.getElementById('admin-room-form-modal'),
                document.getElementById('edit-reservation-modal')];
            allModals.forEach(modal => {
                if (modal && modal.classList.contains('active')) closeModal(modal);
            });
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    const username = el.usernameInput.value.trim();
    const password = el.passwordInput.value.trim();
    const rememberMe = el.rememberMeCheckbox.checked;

    if (!username || !password) {
        showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    // Intentar con la API
    if (apiAvailable) {
        const result = await ApiService.login(username, password);
        if (result.ok) {
            const { user } = result.data;
            AppState.currentUser = user.username;
            AppState.isLoggedIn = true;
            AppState.userRole = user.role;
            localStorage.setItem('hotelUserRole', user.role);
            if (rememberMe) {
                localStorage.setItem('hotelUser', user.username);
                localStorage.setItem('rememberMe', 'true');
            }
            showNotification(`¡Bienvenido ${user.fullname}! 🌐 (API)`, 'success');
            setTimeout(showDashboard, 1000);
            updateAdminButton();
            return;
        } else {
            showNotification(result.error || 'Usuario o contraseña incorrectos', 'error');
            el.loginForm.style.animation = 'shake 0.5s';
            setTimeout(() => { el.loginForm.style.animation = ''; }, 500);
            return;
        }
    }

    // Fallback: localStorage
    let loginOk = false;
    let userFullname = username;

    if (username === 'usuario' && password === 'password') {
        loginOk = true; userFullname = 'Usuario Demo';
    } else if (username === 'admin' && password === 'admin123') {
        loginOk = true; userFullname = 'Administrador';
    } else {
        const users = JSON.parse(localStorage.getItem('hotelUsers') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        if (user) { loginOk = true; userFullname = user.fullname; }
    }

    if (loginOk) {
        AppState.currentUser = username;
        AppState.isLoggedIn = true;
        if (username === 'admin') {
            AppState.userRole = 'admin';
            localStorage.setItem('hotelUserRole', 'admin');
        } else {
            AppState.userRole = 'user';
            localStorage.setItem('hotelUserRole', 'user');
        }
        if (rememberMe) {
            localStorage.setItem('hotelUser', username);
            localStorage.setItem('rememberMe', 'true');
        }
        showNotification(`¡Bienvenido ${userFullname}! 💾 (Local)`, 'success');
        setTimeout(showDashboard, 1000);
        updateAdminButton();
    } else {
        showNotification('Usuario o contraseña incorrectos', 'error');
        el.loginForm.style.animation = 'shake 0.5s';
        setTimeout(() => { el.loginForm.style.animation = ''; }, 500);
    }
}

function handleLogout() {
    AppState.currentUser = null;
    AppState.isLoggedIn = false;
    AppState.userRole = null;
    localStorage.removeItem('hotelUser');
    localStorage.removeItem('hotelUserRole');
    localStorage.removeItem('rememberMe');
    updateAdminButton();
    el.loginForm.reset();
    showNotification('Sesión cerrada exitosamente', 'success');
    setTimeout(showLogin, 800);
}

async function handleRegister(event) {
    event.preventDefault();
    const fullname = el.registerFullname.value.trim();
    const email = el.registerEmail.value.trim();
    const username = el.registerUsername.value.trim();
    const password = el.registerPassword.value;
    const confirmPassword = el.registerConfirmPassword.value;
    const termsAccepted = el.acceptTerms.checked;

    if (!fullname || !email || !username || !password || !confirmPassword) {
        showNotification('Por favor completa todos los campos', 'error'); return;
    }
    if (!termsAccepted) {
        showNotification('Debes aceptar los términos y condiciones', 'error'); return;
    }
    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        el.registerForm.style.animation = 'shake 0.5s';
        setTimeout(() => { el.registerForm.style.animation = ''; }, 500);
        return;
    }
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error'); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingresa un email válido', 'error'); return;
    }

    // Intentar con la API
    if (apiAvailable) {
        const result = await ApiService.register({ fullname, email, username, password });
        if (result.ok) {
            showNotification('¡Cuenta creada exitosamente! 🌐 (API)', 'success');
            el.registerForm.reset();
            setTimeout(() => {
                showLogin();
                showNotification('Ahora puedes iniciar sesión', 'success');
            }, 2000);
        } else {
            showNotification(result.error || 'Error al registrar', 'error');
        }
        return;
    }

    // Fallback: localStorage
    const existingUsers = JSON.parse(localStorage.getItem('hotelUsers') || '[]');
    if (existingUsers.some(u => u.username === username || u.email === email)) {
        showNotification('El usuario o email ya está registrado', 'error'); return;
    }
    existingUsers.push({ fullname, email, username, password, createdAt: new Date().toISOString() });
    localStorage.setItem('hotelUsers', JSON.stringify(existingUsers));
    showNotification('¡Cuenta creada exitosamente! 💾 (Local)', 'success');
    el.registerForm.reset();
    setTimeout(() => {
        showLogin();
        showNotification('Ahora puedes iniciar sesión con tus credenciales', 'success');
    }, 2000);
}

// ============================================================
//  PAGE TRANSITIONS
// ============================================================
function showLogin() {
    el.loginPage.classList.add('active');
    el.registerPage.classList.remove('active');
    el.dashboardPage.classList.remove('active');
    document.body.style.overflow = 'hidden';
}

function showRegister() {
    el.loginPage.classList.remove('active');
    el.registerPage.classList.add('active');
    el.dashboardPage.classList.remove('active');
    document.body.style.overflow = 'hidden';
}

function showDashboard() {
    el.loginPage.classList.remove('active');
    el.registerPage.classList.remove('active');
    el.dashboardPage.classList.add('active');
    document.body.style.overflow = 'auto';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateAdminButton();
}

// ============================================================
//  NAVIGATION
// ============================================================
function toggleMobileMenu() {
    el.navMenu.classList.toggle('active');
}

function handleNavigation(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href');
    if (!targetId || targetId === '#') return;
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
        el.navMenu.classList.remove('active');
        const headerHeight = document.querySelector('.main-header').offsetHeight;
        window.scrollTo({ top: targetSection.offsetTop - headerHeight, behavior: 'smooth' });
        el.navLinks.forEach(link => link.classList.remove('active'));
        event.target.classList.add('active');
    }
}

// ============================================================
//  BOOKING WIDGET
// ============================================================
function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    el.checkInInput.setAttribute('min', today);
    el.checkOutInput.setAttribute('min', today);
    el.checkInInput.addEventListener('change', function () {
        el.checkOutInput.setAttribute('min', this.value);
        if (el.checkOutInput.value && el.checkOutInput.value < this.value) {
            el.checkOutInput.value = '';
        }
    });
}

function handleSearch(event) {
    event.preventDefault();
    const checkIn = el.checkInInput.value;
    const checkOut = el.checkOutInput.value;
    const guests = el.guestsInput.value;

    if (!checkIn || !checkOut) {
        showNotification('Por favor selecciona las fechas de entrada y salida', 'error'); return;
    }
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
        showNotification('La fecha de salida debe ser posterior a la entrada', 'error'); return;
    }
    showNotification(`✅ Mostrando habitaciones disponibles — ${nights} noche(s), ${guests} huésped(es)`, 'success');
    setTimeout(() => {
        const roomsSection = document.getElementById('habitaciones');
        const headerHeight = document.querySelector('.main-header').offsetHeight;
        window.scrollTo({ top: roomsSection.offsetTop - headerHeight, behavior: 'smooth' });
    }, 900);
}

function calculateNights(checkIn, checkOut) {
    return Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
}

// ============================================================
//  RESERVATION MODAL
// ============================================================
function openReservationModal(room) {
    AppState.selectedRoom = room;

    el.modalRoomInfo.innerHTML = `
        <span style="font-size:2rem;">${room.icon}</span>
        <span class="room-name">${room.title}</span>
        <span class="room-price-tag">$${room.price}/noche</span>
    `;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    el.resCheckin.setAttribute('min', today);
    el.resCheckout.setAttribute('min', today);
    el.resCheckin.value = el.checkInInput.value || today;
    el.resCheckout.value = el.checkOutInput.value || tomorrow;
    el.resGuests.value = el.guestsInput.value || '2';

    // Pre-fill user data
    const users = JSON.parse(localStorage.getItem('hotelUsers') || '[]');
    const currentUserData = users.find(u => u.username === AppState.currentUser);
    if (currentUserData) {
        el.resName.value = currentUserData.fullname || '';
        el.resEmail.value = currentUserData.email || '';
    } else if (AppState.currentUser === 'usuario') {
        el.resName.value = 'Usuario Demo';
        el.resEmail.value = 'demo@hotelelegance.com';
    } else {
        el.resName.value = '';
        el.resEmail.value = '';
    }

    el.resSpecial.value = '';
    updatePriceSummary();
    openModal(el.reservationModal);
}

function updatePriceSummary() {
    const room = AppState.selectedRoom;
    if (!room) return;

    const checkIn = el.resCheckin.value;
    const checkOut = el.resCheckout.value;

    if (!checkIn || !checkOut) {
        el.priceSummary.innerHTML = `
            <div class="price-row">
                <span>Selecciona las fechas para ver el precio total</span>
            </div>`;
        return;
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
        el.priceSummary.innerHTML = `
            <div class="price-row">
                <span style="color:#EF4444;">⚠️ La fecha de salida debe ser posterior a la de entrada</span>
            </div>`;
        return;
    }

    const subtotal = room.price * nights;
    const taxes = Math.round(subtotal * 0.12);
    const total = subtotal + taxes;

    el.priceSummary.innerHTML = `
        <div class="price-row"><span>🛏️ ${room.title} × ${nights} noche(s)</span><span>$${subtotal}</span></div>
        <div class="price-row"><span>🧾 Impuestos (12%)</span><span>$${taxes}</span></div>
        <div class="price-row price-total"><span>💰 Total</span><span>$${total}</span></div>
    `;
}

async function handleReservationSubmit(event) {
    event.preventDefault();
    const room = AppState.selectedRoom;
    const checkIn = el.resCheckin.value;
    const checkOut = el.resCheckout.value;
    const guests = el.resGuests.value;
    const name = el.resName.value.trim();
    const email = el.resEmail.value.trim();
    const special = el.resSpecial.value.trim();

    if (!checkIn || !checkOut || !name || !email) {
        showNotification('Por favor completa todos los campos obligatorios', 'error'); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingresa un email válido', 'error'); return;
    }
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
        showNotification('La fecha de salida debe ser posterior a la de entrada', 'error'); return;
    }

    // Enviar a la API
    if (apiAvailable) {
        const result = await ApiService.createReservation({
            roomId: room.id, checkIn, checkOut, guests, name, email, special,
            username: AppState.currentUser
        });
        if (result.ok) {
            closeModal(el.reservationModal);
            showConfirmation(result.data.reservation);
            showNotification('✅ Reserva guardada en el servidor', 'success');
        } else {
            showNotification(result.error || 'Error al crear la reserva', 'error');
        }
        return;
    }

    // Fallback: localStorage
    const subtotal = room.price * nights;
    const taxes = Math.round(subtotal * 0.12);
    const total = subtotal + taxes;

    const reservation = {
        id: 'RES-' + Date.now(),
        roomId: room.id, roomTitle: room.title, roomIcon: room.icon,
        checkIn, checkOut, nights, guests, name, email, special,
        price: room.price, subtotal, taxes, total,
        status: 'confirmed',
        user: AppState.currentUser,
        createdAt: new Date().toISOString()
    };

    saveReservationLocal(reservation);
    closeModal(el.reservationModal);
    showConfirmation(reservation);
}

function saveReservationLocal(reservation) {
    const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
    all.unshift(reservation);
    localStorage.setItem('hotelReservations', JSON.stringify(all));
}

async function getUserReservations() {
    if (apiAvailable) {
        const result = await ApiService.getUserReservations(AppState.currentUser);
        if (result.ok) return result.data.reservations;
    }
    // Fallback
    const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
    return all.filter(r => r.user === AppState.currentUser);
}

// ============================================================
//  OFFER MODAL
// ============================================================
function openOfferModal(offer) {
    AppState.selectedOffer = offer;
    el.offerModalIcon.textContent = offer.icon;
    el.offerModalTitle.textContent = offer.title;
    el.offerModalBadge.textContent = offer.badge;

    const priceHTML = offer.oldPrice
        ? `<span class="old-price" style="font-size:1.2rem;color:#9CA3AF;text-decoration:line-through;">$${offer.oldPrice}</span>
           <span class="new-price">$${offer.newPrice}</span>`
        : `<span class="new-price">$${offer.newPrice}</span>`;

    const includesHTML = offer.includes
        .map(item => `<li>✅ ${item}</li>`)
        .join('');

    el.offerModalBody.innerHTML = `
        <p class="offer-detail-description">${offer.description}</p>
        <h4 style="color:var(--color-primary);margin-bottom:.75rem;font-family:var(--font-heading);">Incluye:</h4>
        <ul class="offer-includes">${includesHTML}</ul>
        <div class="offer-price-block">${priceHTML}</div>
        <p class="offer-validity">📅 ${offer.validity}</p>
    `;

    openModal(el.offerModal);
}

function handleBookOffer() {
    const offer = AppState.selectedOffer;
    if (!offer) return;
    closeModal(el.offerModal);
    const room = ROOMS.find(r => r.id === 'suite-lujo') || ROOMS[0];
    setTimeout(() => openReservationModal(room), 300);
    showNotification(`🎁 Oferta "${offer.title}" aplicada a tu reserva`, 'success');
}

// ============================================================
//  MY RESERVATIONS MODAL
// ============================================================
async function openMyReservations() {
    el.reservationsList.innerHTML = '<div style="text-align:center;padding:2rem;">⏳ Cargando reservas...</div>';
    openModal(el.myReservationsModal);

    const reservations = await getUserReservations();

    if (reservations.length === 0) {
        el.reservationsList.innerHTML = `
            <div class="no-reservations">
                <div class="no-res-icon">🏨</div>
                <p>Aún no tienes reservaciones.</p>
                <p style="margin-top:.5rem;font-size:.95rem;">¡Reserva una habitación y aparecerá aquí!</p>
            </div>`;
    } else {
        el.reservationsList.innerHTML = reservations.map(r => `
            <div class="reservation-card">
                <div class="reservation-card-icon">${r.roomIcon || '🛏️'}</div>
                <div class="reservation-card-body">
                    <h4>${r.roomTitle}</h4>
                    <p>📅 ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)}</p>
                    <p>👤 ${r.name} &nbsp;|&nbsp; 👥 ${r.guests} huésped(es)</p>
                    <p>🔖 ${r.id}</p>
                    <span class="reservation-status status-${r.status || 'confirmed'}">
                        ${r.status === 'cancelled' ? '✕ Cancelada' : '✓ Confirmada'}
                    </span>
                    ${r.status !== 'cancelled' ? `
                    <div class="reservation-card-actions">
                        <button class="btn-edit-res" onclick="openEditReservation('${r.id}', '${r.checkIn}', '${r.checkOut}', '${r.guests}', '${(r.special || '').replace(/'/g, "\\'").replace(/\n/g, ' ')}', ${r.price})">✏️ Editar</button>
                        <button class="btn-cancel-res" onclick="cancelUserReservation('${r.id}')">✕ Cancelar</button>
                    </div>` : ''}
                </div>
                <div class="reservation-card-price">
                    <span class="total">$${r.total}</span>
                    <span class="nights">${r.nights} noche(s)</span>
                </div>
            </div>
        `).join('');
    }
}

// ============================================================
//  CONFIRMATION MODAL
// ============================================================
function showConfirmation(reservation) {
    el.confirmationDetails.innerHTML = `
        <p><span>🛏️ Habitación:</span><strong>${reservation.roomTitle}</strong></p>
        <p><span>📅 Entrada:</span><strong>${formatDate(reservation.checkIn)}</strong></p>
        <p><span>📅 Salida:</span><strong>${formatDate(reservation.checkOut)}</strong></p>
        <p><span>🌙 Noches:</span><strong>${reservation.nights}</strong></p>
        <p><span>👥 Huéspedes:</span><strong>${reservation.guests}</strong></p>
        <p><span>👤 Titular:</span><strong>${reservation.name}</strong></p>
        <p><span>💰 Total:</span><strong>$${reservation.total} USD</strong></p>
        <p><span>🔖 Nº Reserva:</span><strong>${reservation.id}</strong></p>
    `;
    openModal(el.confirmationModal);
}

// ============================================================
//  MODAL HELPERS
// ============================================================
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    const allModals = [el.reservationModal, el.offerModal, el.myReservationsModal, el.confirmationModal, el.termsModal,
        document.getElementById('admin-panel-modal'), document.getElementById('admin-room-form-modal'),
        document.getElementById('edit-reservation-modal')];
    const anyOpen = allModals.some(m => m && m.classList.contains('active'));
    if (!anyOpen) document.body.style.overflow = 'auto';
}

// ============================================================
//  UTILITIES
// ============================================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.95rem',
        zIndex: '9999',
        animation: 'slideInRight 0.3s ease-out',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        maxWidth: '400px',
        backgroundColor: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'
    });
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
}

// ── ANIMACIONES GLOBALES ─────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%,100% { transform: translateX(0); }
        10%,30%,50%,70%,90% { transform: translateX(-10px); }
        20%,40%,60%,80% { transform: translateX(10px); }
    }
    @keyframes slideInRight {
        from { transform: translateX(110%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(110%); opacity: 0; }
    }
    .status-cancelled { background: #EF4444 !important; }
`;
document.head.appendChild(style);

// ============================================================
//  ADMIN BUTTON VISIBILITY
// ============================================================
function updateAdminButton() {
    const adminLi = document.getElementById('admin-btn-li');
    if (adminLi) {
        adminLi.style.display = AppState.userRole === 'admin' ? '' : 'none';
    }
}

// ============================================================
//  ADMIN PANEL
// ============================================================
function openAdminPanel() {
    const modal = document.getElementById('admin-panel-modal');
    if (!modal) return;
    openModal(modal);
    loadAdminRooms();
}

function initAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById('admin-tab-' + tab.dataset.tab);
            if (target) target.classList.add('active');
            // Load data for the tab
            if (tab.dataset.tab === 'rooms') loadAdminRooms();
            else if (tab.dataset.tab === 'reservations') loadAdminReservations();
            else if (tab.dataset.tab === 'users') loadAdminUsers();
        });
    });
}

// ── Admin: Rooms ────────────────────────────────────────
async function loadAdminRooms() {
    const container = document.getElementById('admin-rooms-list');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:2rem;">⏳ Cargando...</div>';

    let rooms = [...ROOMS];
    if (apiAvailable) {
        const res = await ApiService.getRooms();
        if (res.ok && res.data.rooms) rooms = res.data.rooms;
    }

    if (rooms.length === 0) {
        container.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">🛏️</div><p>No hay habitaciones registradas</p></div>';
        return;
    }

    container.innerHTML = rooms.map(room => `
        <div class="admin-item">
            <div class="admin-item-icon">${room.icon || '🛏️'}</div>
            <div class="admin-item-body">
                <h4>${room.title} ${room.badge ? '<span class="admin-status-badge admin-status-confirmed">' + room.badge + '</span>' : ''}</h4>
                <p>$${room.price}/noche — ${(room.features || []).join(', ')}</p>
            </div>
            <div class="admin-item-actions">
                <button class="btn-action btn-action-edit" onclick="openEditRoomForm('${room.id}')">✏️ Editar</button>
                <button class="btn-action btn-action-delete" onclick="confirmDeleteRoom('${room.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `).join('');
}

let editingRoomsData = [];

async function openEditRoomForm(roomId) {
    let rooms = [...ROOMS];
    if (apiAvailable) {
        const res = await ApiService.getRooms();
        if (res.ok && res.data.rooms) rooms = res.data.rooms;
    }
    const room = rooms.find(r => r.id === roomId);
    if (!room) { showNotification('Habitación no encontrada', 'error'); return; }

    document.getElementById('admin-room-form-title').textContent = 'Editar Habitación';
    document.getElementById('admin-room-id').value = room.id;
    document.getElementById('admin-room-title').value = room.title;
    document.getElementById('admin-room-price').value = room.price;
    document.getElementById('admin-room-icon').value = room.icon || '🛏️';
    document.getElementById('admin-room-badge').value = room.badge || '';
    document.getElementById('admin-room-features').value = (room.features || []).join(', ');
    document.getElementById('admin-room-description').value = room.description || '';

    const formModal = document.getElementById('admin-room-form-modal');
    openModal(formModal);
}

function openNewRoomForm() {
    document.getElementById('admin-room-form-title').textContent = 'Nueva Habitación';
    document.getElementById('admin-room-form').reset();
    document.getElementById('admin-room-id').value = '';
    document.getElementById('admin-room-icon').value = '🛏️';
    const formModal = document.getElementById('admin-room-form-modal');
    openModal(formModal);
}

async function handleAdminRoomFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('admin-room-id').value;
    const title = document.getElementById('admin-room-title').value.trim();
    const price = parseFloat(document.getElementById('admin-room-price').value);
    const icon = document.getElementById('admin-room-icon').value.trim() || '🛏️';
    const badge = document.getElementById('admin-room-badge').value.trim() || null;
    const featuresStr = document.getElementById('admin-room-features').value.trim();
    const features = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(f => f) : [];
    const description = document.getElementById('admin-room-description').value.trim();

    if (!title || !price || !description) {
        showNotification('Título, precio y descripción son obligatorios', 'error');
        return;
    }

    if (apiAvailable) {
        if (id) {
            // Editing existing room
            const res = await ApiService.updateRoom(id, { title, price, icon, badge, features, description });
            if (res.ok) {
                showNotification('✅ Habitación actualizada', 'success');
            } else {
                showNotification(res.error || 'Error al actualizar', 'error');
                return;
            }
        } else {
            // Creating new room
            const res = await ApiService.post('/rooms', { title, price, icon, badge, features, description });
            if (res.ok) {
                showNotification('✅ Habitación creada', 'success');
            } else {
                showNotification(res.error || 'Error al crear', 'error');
                return;
            }
        }
    } else {
        showNotification('⚠️ Operación requiere conexión al servidor', 'error');
        return;
    }

    closeModal(document.getElementById('admin-room-form-modal'));
    await loadAdminRooms();
    await loadData(); // Refresh main page rooms
}

async function confirmDeleteRoom(roomId) {
    if (!confirm('¿Estás seguro de eliminar esta habitación? Esta acción no se puede deshacer.')) return;
    if (apiAvailable) {
        const res = await ApiService.deleteRoom(roomId);
        if (res.ok) {
            showNotification('✅ Habitación eliminada', 'success');
            await loadAdminRooms();
            await loadData();
        } else {
            showNotification(res.error || 'Error al eliminar', 'error');
        }
    } else {
        showNotification('⚠️ Operación requiere conexión al servidor', 'error');
    }
}

// ── Admin: Reservations ─────────────────────────────────
async function loadAdminReservations() {
    const container = document.getElementById('admin-reservations-list');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:2rem;">⏳ Cargando...</div>';

    if (!apiAvailable) {
        // Fallback: show local reservations
        const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
        renderAdminReservations(container, all);
        return;
    }

    const res = await ApiService.getAllReservations();
    if (res.ok) {
        renderAdminReservations(container, res.data.reservations || []);
    } else {
        container.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">⚠️</div><p>Error cargando reservaciones</p></div>';
    }
}

function renderAdminReservations(container, reservations) {
    if (reservations.length === 0) {
        container.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">📋</div><p>No hay reservaciones</p></div>';
        return;
    }

    container.innerHTML = reservations.map(r => `
        <div class="admin-item">
            <div class="admin-item-icon">${r.roomIcon || '🛏️'}</div>
            <div class="admin-item-body">
                <h4>${r.roomTitle} <span class="admin-status-badge admin-status-${r.status || 'confirmed'}">${r.status === 'cancelled' ? '✕ Cancelada' : '✓ Confirmada'}</span></h4>
                <p>👤 ${r.name} (${r.username || r.user || 'N/A'}) — 📅 ${formatDate(r.checkIn)} → ${formatDate(r.checkOut)} — 💰 $${r.total}</p>
            </div>
            <div class="admin-item-actions">
                ${r.status !== 'cancelled' ? `<button class="btn-action btn-action-cancel" onclick="adminCancelReservation('${r.id}')">✕ Cancelar</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function adminCancelReservation(resId) {
    if (!confirm('¿Cancelar esta reservación?')) return;
    if (apiAvailable) {
        const res = await ApiService.updateReservation(resId, { status: 'cancelled' });
        if (res.ok) {
            showNotification('✅ Reservación cancelada', 'success');
            await loadAdminReservations();
        } else {
            showNotification(res.error || 'Error al cancelar', 'error');
        }
    } else {
        const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
        const idx = all.findIndex(r => r.id === resId);
        if (idx >= 0) { all[idx].status = 'cancelled'; localStorage.setItem('hotelReservations', JSON.stringify(all)); }
        showNotification('✅ Reservación cancelada (local)', 'success');
        await loadAdminReservations();
    }
}

// ── Admin: Users ────────────────────────────────────────
async function loadAdminUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:2rem;">⏳ Cargando...</div>';

    if (!apiAvailable) {
        const localUsers = JSON.parse(localStorage.getItem('hotelUsers') || '[]');
        const defaultUsers = [{ username: 'admin', fullname: 'Administrador', email: 'admin@hotelelegance.com', role: 'admin' }, { username: 'usuario', fullname: 'Usuario Demo', email: 'demo@hotelelegance.com', role: 'user' }];
        renderAdminUsers(container, [...defaultUsers, ...localUsers]);
        return;
    }

    const res = await ApiService.getUsers();
    if (res.ok) {
        renderAdminUsers(container, res.data.users || []);
    } else {
        container.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">⚠️</div><p>Error cargando usuarios</p></div>';
    }
}

function renderAdminUsers(container, users) {
    if (users.length === 0) {
        container.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">👥</div><p>No hay usuarios registrados</p></div>';
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="admin-item">
            <div class="admin-item-icon">${u.role === 'admin' ? '👑' : '👤'}</div>
            <div class="admin-item-body">
                <h4>${u.fullname || u.username} <span class="admin-status-badge ${u.role === 'admin' ? 'admin-status-confirmed' : ''}" style="${u.role !== 'admin' ? 'background:#EEF2FF;color:#4F46E5;' : ''}">${u.role === 'admin' ? 'Admin' : 'Usuario'}</span></h4>
                <p>📧 ${u.email || 'N/A'} — 🆔 ${u.username}</p>
            </div>
            <div class="admin-item-actions">
                ${u.username !== 'admin' ? `<button class="btn-action btn-action-delete" onclick="confirmDeleteUser('${u.id}', '${u.username}')">🗑️ Eliminar</button>` : '<span style="font-size:0.8rem;color:var(--color-text-light);">Protegido</span>'}
            </div>
        </div>
    `).join('');
}

async function confirmDeleteUser(userId, username) {
    if (!confirm(`¿Eliminar al usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    if (apiAvailable) {
        const res = await ApiService.deleteUser(userId);
        if (res.ok) {
            showNotification('✅ Usuario eliminado', 'success');
            await loadAdminUsers();
        } else {
            showNotification(res.error || 'Error al eliminar', 'error');
        }
    } else {
        const users = JSON.parse(localStorage.getItem('hotelUsers') || '[]');
        const filtered = users.filter(u => u.username !== username);
        localStorage.setItem('hotelUsers', JSON.stringify(filtered));
        showNotification('✅ Usuario eliminado (local)', 'success');
        await loadAdminUsers();
    }
}

// ============================================================
//  USER: CANCEL RESERVATION
// ============================================================
async function cancelUserReservation(resId) {
    if (!confirm('¿Estás seguro de cancelar esta reservación?')) return;
    if (apiAvailable) {
        const res = await ApiService.cancelReservation(resId, AppState.currentUser);
        if (res.ok) {
            showNotification('✅ Reservación cancelada exitosamente', 'success');
            await openMyReservations();
        } else {
            showNotification(res.error || 'Error al cancelar', 'error');
        }
    } else {
        const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
        const idx = all.findIndex(r => r.id === resId && r.user === AppState.currentUser);
        if (idx >= 0) {
            all[idx].status = 'cancelled';
            localStorage.setItem('hotelReservations', JSON.stringify(all));
            showNotification('✅ Reservación cancelada (local)', 'success');
            await openMyReservations();
        } else {
            showNotification('Reservación no encontrada', 'error');
        }
    }
}

// ============================================================
//  USER: EDIT RESERVATION
// ============================================================
function openEditReservation(resId, checkIn, checkOut, guests, special, price) {
    document.getElementById('edit-res-id').value = resId;
    document.getElementById('edit-res-room-price').value = price;
    document.getElementById('edit-res-checkin').value = checkIn;
    document.getElementById('edit-res-checkout').value = checkOut;
    document.getElementById('edit-res-guests').value = guests;
    document.getElementById('edit-res-special').value = special || '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('edit-res-checkin').setAttribute('min', today);
    document.getElementById('edit-res-checkout').setAttribute('min', today);
    const modal = document.getElementById('edit-reservation-modal');
    openModal(modal);
}

async function handleEditReservationSubmit(e) {
    e.preventDefault();
    const resId = document.getElementById('edit-res-id').value;
    const checkIn = document.getElementById('edit-res-checkin').value;
    const checkOut = document.getElementById('edit-res-checkout').value;
    const guests = document.getElementById('edit-res-guests').value;
    const special = document.getElementById('edit-res-special').value.trim();

    if (!checkIn || !checkOut) {
        showNotification('Por favor completa las fechas', 'error');
        return;
    }
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
        showNotification('La fecha de salida debe ser posterior a la entrada', 'error');
        return;
    }

    if (apiAvailable) {
        const res = await ApiService.updateReservation(resId, {
            username: AppState.currentUser,
            checkIn, checkOut, guests, special
        });
        if (res.ok) {
            showNotification('✅ Reservación actualizada exitosamente', 'success');
        } else {
            showNotification(res.error || 'Error al actualizar', 'error');
            return;
        }
    } else {
        const all = JSON.parse(localStorage.getItem('hotelReservations') || '[]');
        const idx = all.findIndex(r => r.id === resId && r.user === AppState.currentUser);
        if (idx >= 0) {
            const price = parseFloat(document.getElementById('edit-res-room-price').value) || all[idx].price;
            all[idx].checkIn = checkIn;
            all[idx].checkOut = checkOut;
            all[idx].nights = nights;
            all[idx].guests = guests;
            all[idx].special = special;
            all[idx].subtotal = price * nights;
            all[idx].taxes = Math.round(all[idx].subtotal * 0.12);
            all[idx].total = all[idx].subtotal + all[idx].taxes;
            localStorage.setItem('hotelReservations', JSON.stringify(all));
            showNotification('✅ Reservación actualizada (local)', 'success');
        } else {
            showNotification('Reservación no encontrada', 'error');
            return;
        }
    }

    closeModal(document.getElementById('edit-reservation-modal'));
    await openMyReservations();
}



// ============================================================
//  ADMIN EVENT LISTENERS SETUP
// ============================================================
function attachAdminListeners() {
    // Admin panel button
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', openAdminPanel);
    }

    // Close admin panel
    const closeAdminPanel = document.getElementById('close-admin-panel');
    if (closeAdminPanel) {
        closeAdminPanel.addEventListener('click', () => {
            const modal = document.getElementById('admin-panel-modal');
            if (modal) closeModal(modal);
        });
    }

    // Admin panel backdrop click
    const adminPanelModal = document.getElementById('admin-panel-modal');
    if (adminPanelModal) {
        adminPanelModal.addEventListener('click', (e) => {
            if (e.target === adminPanelModal) closeModal(adminPanelModal);
        });
    }

    // Add room button
    const addRoomBtn = document.getElementById('add-room-btn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', openNewRoomForm);
    }

    // Admin room form
    const adminRoomForm = document.getElementById('admin-room-form');
    if (adminRoomForm) {
        adminRoomForm.addEventListener('submit', handleAdminRoomFormSubmit);
    }

    // Close admin room form
    const closeAdminRoomForm = document.getElementById('close-admin-room-form');
    if (closeAdminRoomForm) {
        closeAdminRoomForm.addEventListener('click', () => {
            closeModal(document.getElementById('admin-room-form-modal'));
        });
    }

    // Admin room form backdrop
    const adminRoomFormModal = document.getElementById('admin-room-form-modal');
    if (adminRoomFormModal) {
        adminRoomFormModal.addEventListener('click', (e) => {
            if (e.target === adminRoomFormModal) closeModal(adminRoomFormModal);
        });
    }

    // Init tabs
    initAdminTabs();

    // Edit reservation modal
    const editResForm = document.getElementById('edit-res-form');
    if (editResForm) {
        editResForm.addEventListener('submit', handleEditReservationSubmit);
    }

    const closeEditRes = document.getElementById('close-edit-reservation');
    if (closeEditRes) {
        closeEditRes.addEventListener('click', () => {
            closeModal(document.getElementById('edit-reservation-modal'));
        });
    }

    const editResModal = document.getElementById('edit-reservation-modal');
    if (editResModal) {
        editResModal.addEventListener('click', (e) => {
            if (e.target === editResModal) closeModal(editResModal);
        });
    }


}

// Make sure global function handlers are exposed to global/window scope
window.openEditRoomForm = openEditRoomForm;
window.confirmDeleteRoom = confirmDeleteRoom;
window.adminCancelReservation = adminCancelReservation;
window.confirmDeleteUser = confirmDeleteUser;
window.cancelUserReservation = cancelUserReservation;
window.openEditReservation = openEditReservation;

document.head.appendChild(style);

// ── BOOTSTRAP ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initializeApp);

console.log('%c🏨 Hotel Elegance', 'font-size:24px;font-weight:bold;color:#D4AF37;');
console.log('%cAplicación iniciada con API REST + fallback localStorage', 'color:#10B981;');
console.log(`%cAPI: ${API_BASE}`, 'color:#6B7280;');
