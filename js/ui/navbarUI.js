/**
 * ============================================================================
 * ARCHIVO: js/ui/navbarUI.js
 * RESPONSABILIDAD: Barra de usuario global, selector regional (SV / GT),
 * Modal de Autenticación (Login / Registro con rol 'cliente' por defecto)
 * y Modal para configurar llaves de Firebase en vivo si aún no se han colocado.
 * ============================================================================
 */

import {
    loginUser,
    registerUser,
    logoutUser,
    subscribeToAuthChanges,
    updateUserProfileData
} from "../services/authService.js";
import {
    isFirebaseConfigured,
    getActiveFirebaseConfig,
    saveCustomFirebaseConfig,
    clearCustomFirebaseConfig
} from "../config/firebaseConfig.js";
import { validateLoginForm, validateRegisterForm } from "../utils/validators.js";
import { showToast } from "./notificationsUI.js";

const REGION_STORAGE_KEY = "bioaqua_active_region";

/**
 * Obtiene el país/región actualmente seleccionado por el visitante o usuario ('SV' o 'GT').
 * @returns {'SV'|'GT'}
 */
export function getActiveRegion() {
    const saved = localStorage.getItem(REGION_STORAGE_KEY);
    return saved === "GT" ? "GT" : "SV";
}

/**
 * Cambia el país activo ('SV' o 'GT') y dispara un evento global para actualizar precios y filtros.
 * @param {'SV'|'GT'} regionCode
 */
export function setActiveRegion(regionCode) {
    const valid = regionCode === "GT" ? "GT" : "SV";
    localStorage.setItem(REGION_STORAGE_KEY, valid);
    window.dispatchEvent(new CustomEvent("bioaqua:regionChanged", { detail: { region: valid } }));
}

/**
 * Inicializa la barra de sesión y el modal de Auth en el `<header>` de cualquier página.
 */
export function initNavbarUI() {
    const header = document.querySelector("header.header");
    if (!header) return;

    // 1. Crear contenedor de utilidades de usuario y región en el header
    let userToolbar = document.getElementById("bio-header-toolbar");
    if (!userToolbar) {
        userToolbar = document.createElement("div");
        userToolbar.id = "bio-header-toolbar";
        userToolbar.className = "bio-header-toolbar";
        header.appendChild(userToolbar);
    }

    // 2. Asegurar que exista el modal de Configuración Firebase en el DOM
    ensureFirebaseConfigModalInDOM();

    // 3. Suscribirse a cambios de autenticación para renderizar según rol ('admin', 'cliente', o visitante)
    subscribeToAuthChanges((userProfile) => {
        // Si el usuario tiene país asignado en su perfil, sincronizar región inicial
        if (userProfile && userProfile.pais === "Guatemala" && !localStorage.getItem(REGION_STORAGE_KEY)) {
            setActiveRegion("GT");
        }
        renderHeaderToolbar(userToolbar, userProfile);
    });

    // Escuchar cambio de región para refrescar el selector del header
    window.addEventListener("bioaqua:regionChanged", () => {
        const select = userToolbar.querySelector("#bio-region-selector");
        if (select) select.value = getActiveRegion();
    });
}

/**
 * Renderiza dinámicamente los controles del Header según el rol del usuario.
 * @param {HTMLElement} container
 * @param {Object|null} user
 */
function renderHeaderToolbar(container, user) {
    const currentRegion = getActiveRegion();
    const navAuthItem = document.getElementById("nav-auth-item");

    const regionSelectHTML = `
        <div class="bio-region-pill" title="Selecciona tu país para ver disponibilidad y moneda local">
            <label for="bio-region-selector" class="sr-only">País:</label>
            <select id="bio-region-selector" class="bio-region-select" aria-label="Seleccionar país El Salvador o Guatemala">
                <option value="SV" ${currentRegion === "SV" ? "selected" : ""}>🇸🇻 SV ($ USD)</option>
                <option value="GT" ${currentRegion === "GT" ? "selected" : ""}>🇬🇹 GT (Q GTQ)</option>
            </select>
        </div>
    `;

    if (!user) {
        // Visitante no autenticado: asegurar que el enlace en el menú principal lleve a login.html
        if (navAuthItem) {
            navAuthItem.style.display = "";
            const authLink = navAuthItem.querySelector("a");
            if (authLink) authLink.setAttribute("href", "login.html");
        }

        // En la barra derecha solo mostramos el selector regional (sin botón duplicado)
        container.innerHTML = `
            ${regionSelectHTML}
        `;
    } else {
        // Usuario autenticado ('admin' o 'cliente'): ocultar enlace "Iniciar Sesión" del menú principal
        if (navAuthItem) navAuthItem.style.display = "none";

        const isAdmin = user.rol === "admin";
        const roleBadge = isAdmin
            ? `<span class="bio-role-badge bio-role-badge--admin">ADMIN</span>`
            : `<span class="bio-role-badge bio-role-badge--client">CLIENTE</span>`;

        container.innerHTML = `
            ${regionSelectHTML}
            <div class="bio-user-session">
                <a href="${isAdmin ? "dashboard-admin.html" : "productos.html#mi-rutina-section"}" class="bio-user-info" title="${isAdmin ? "Ir a Panel de Administración" : "Ir a Mi Rutina"}" style="text-decoration:none; cursor:pointer;">
                    <span class="bio-user-name">${escapeHTML(user.nombre || user.email)}</span>
                    ${roleBadge}
                </a>
                <button type="button" class="bio-btn bio-btn--outline-light bio-btn--xs" id="btn-header-logout">
                    Salir
                </button>
            </div>
        `;

        // Evento Logout
        container.querySelector("#btn-header-logout")?.addEventListener("click", async () => {
            try {
                await logoutUser();
                showToast("Has cerrado sesión correctamente.", "info");
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    // Evento cambio de país (El Salvador / Guatemala)
    container.querySelector("#bio-region-selector")?.addEventListener("change", (e) => {
        const selected = e.target.value;
        setActiveRegion(selected);
        showToast(
            selected === "SV"
                ? "🇸🇻 Catálogo ajustado a El Salvador (Precios en USD $)"
                : "🇬🇹 Catálogo ajustado a Guatemala (Precios en Quetzales Q)",
            "info",
            2800
        );
    });

    // Evento abrir modal de configuración de llaves Firebase
    container.querySelector("#btn-open-fb-config")?.addEventListener("click", openFirebaseConfigModal);
}

/**
 * Redirige a la página dedicada de Inicio de Sesión o Registro cuando un componente solicita autenticación.
 * @param {'login'|'register'} tab
 */
export function openAuthModal(tab = "login") {
    if (tab === "register") {
        window.location.href = "registro.html";
    } else {
        window.location.href = "login.html";
    }
}

export function closeAuthModal() {
    const modal = document.getElementById("bio-auth-modal");
    if (modal) modal.classList.remove("active");
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById("bio-form-login");
    const registerForm = document.getElementById("bio-form-register");
    const tabLoginBtn = document.getElementById("bio-tab-login");
    const tabRegisterBtn = document.getElementById("bio-tab-register");
    const errorBox = document.getElementById("bio-auth-errors");

    if (errorBox) errorBox.innerHTML = "";

    if (tab === "register") {
        loginForm?.classList.add("hidden");
        registerForm?.classList.remove("hidden");
        tabLoginBtn?.classList.remove("active");
        tabRegisterBtn?.classList.add("active");
    } else {
        registerForm?.classList.add("hidden");
        loginForm?.classList.remove("hidden");
        tabRegisterBtn?.classList.remove("active");
        tabLoginBtn?.classList.add("active");
    }
}

/**
 * Inyecta en el DOM el Modal de Login y Registro con validaciones JS personalizadas.
 */
function ensureAuthModalInDOM() {
    if (document.getElementById("bio-auth-modal")) return;

    const modalOverlay = document.createElement("div");
    modalOverlay.id = "bio-auth-modal";
    modalOverlay.className = "bio-modal-overlay";
    modalOverlay.setAttribute("role", "dialog");
    modalOverlay.setAttribute("aria-modal", "true");
    modalOverlay.setAttribute("aria-labelledby", "bio-auth-modal-title");

    modalOverlay.innerHTML = `
        <div class="bio-modal">
            <div class="bio-modal__header">
                <div>
                    <span class="bio-modal__eyebrow">BIOAQUA EL SALVADOR & GUATEMALA</span>
                    <h3 id="bio-auth-modal-title">Acceso a tu Ritual Bioaqua</h3>
                </div>
                <button type="button" class="bio-modal__close" id="bio-auth-close" aria-label="Cerrar ventana">×</button>
            </div>

            <div class="bio-auth-tabs">
                <button type="button" id="bio-tab-login" class="bio-auth-tab active">Iniciar Sesión</button>
                <button type="button" id="bio-tab-register" class="bio-auth-tab">Crear Cuenta (Cliente)</button>
            </div>

            <div class="bio-modal__body">
                <div id="bio-auth-errors" class="bio-form-errors" aria-live="assertive"></div>

                <!-- ACCESO RÁPIDO PARA EVALUACIÓN Y DEFENSA TÉCNICA -->
                <div class="bio-quick-demo-box">
                    <span>Acceso rápido de prueba (1 clic):</span>
                    <div class="bio-quick-demo-btns">
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" id="btn-demo-admin">
                            Entrar como Admin (SV/GT)
                        </button>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" id="btn-demo-client-sv">
                            Cliente El Salvador 🇸🇻
                        </button>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" id="btn-demo-client-gt">
                            Cliente Guatemala 🇬🇹
                        </button>
                    </div>
                </div>

                <!-- FORMULARIO DE LOGIN -->
                <form id="bio-form-login" class="bio-form" novalidate>
                    <div class="bio-form-group">
                        <label for="login-email">Correo electrónico *</label>
                        <input type="email" id="login-email" name="email" placeholder="ejemplo@correo.com" required>
                    </div>
                    <div class="bio-form-group">
                        <label for="login-password">Contraseña *</label>
                        <input type="password" id="login-password" name="password" placeholder="Mínimo 6 caracteres" required>
                    </div>
                    <button type="submit" class="bio-btn bio-btn--primary bio-btn--block" id="btn-submit-login">
                        Iniciar Sesión
                    </button>
                </form>

                <!-- FORMULARIO DE REGISTRO (Asigna rol 'cliente' por defecto) -->
                <form id="bio-form-register" class="bio-form hidden" novalidate>
                    <div class="bio-form-group">
                        <label for="reg-nombre">Nombre completo *</label>
                        <input type="text" id="reg-nombre" name="nombre" placeholder="Ej. Andrea Martínez" required>
                    </div>
                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="reg-pais">País de residencia *</label>
                            <select id="reg-pais" name="pais" required>
                                <option value="El Salvador">🇸🇻 El Salvador (USD $)</option>
                                <option value="Guatemala">🇬🇹 Guatemala (GTQ Q)</option>
                            </select>
                        </div>
                        <div class="bio-form-group">
                            <label for="reg-piel">Tu tipo de piel *</label>
                            <select id="reg-piel" name="tipoPiel" required>
                                <option value="Mixta">Piel Mixta</option>
                                <option value="Grasa">Piel Grasa / Acné</option>
                                <option value="Seca">Piel Seca</option>
                                <option value="Sensible">Piel Sensible</option>
                                <option value="Todas">Normal / Todo tipo</option>
                            </select>
                        </div>
                    </div>
                    <div class="bio-form-group">
                        <label for="reg-email">Correo electrónico *</label>
                        <input type="email" id="reg-email" name="email" placeholder="tu-correo@dominio.com" required>
                    </div>
                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="reg-password">Contraseña *</label>
                            <input type="password" id="reg-password" name="password" placeholder="Mín. 6 caracteres" required>
                        </div>
                        <div class="bio-form-group">
                            <label for="reg-confirm">Confirmar contraseña *</label>
                            <input type="password" id="reg-confirm" name="confirmPassword" placeholder="Repite tu contraseña" required>
                        </div>
                    </div>
                    <p class="bio-form-help">
                        Nota: El registro público crea tu perfil con rol <strong>cliente</strong> para que armes tu rutina Bioaqua y publiques reseñas.
                    </p>
                    <button type="submit" class="bio-btn bio-btn--primary bio-btn--block" id="btn-submit-register">
                        Crear mi cuenta Bioaqua
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // Eventos de pestañas y cierre
    modalOverlay.querySelector("#bio-auth-close")?.addEventListener("click", closeAuthModal);
    modalOverlay.querySelector("#bio-tab-login")?.addEventListener("click", () => switchAuthTab("login"));
    modalOverlay.querySelector("#bio-tab-register")?.addEventListener("click", () => switchAuthTab("register"));
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeAuthModal();
    });

    // Envío de Login con validación JS
    const loginForm = modalOverlay.querySelector("#bio-form-login");
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById("bio-auth-errors");
        const submitBtn = document.getElementById("btn-submit-login");

        const formData = {
            email: loginForm.email.value,
            password: loginForm.password.value
        };

        const validation = validateLoginForm(formData);
        if (!validation.isValid) {
            renderFormErrors(errorBox, validation.errors);
            return;
        }

        try {
            errorBox.innerHTML = "";
            submitBtn.disabled = true;
            submitBtn.textContent = "Verificando credenciales...";

            const profile = await loginUser(formData);
            if (profile.pais === "Guatemala") setActiveRegion("GT");
            if (profile.pais === "El Salvador") setActiveRegion("SV");

            closeAuthModal();
            loginForm.reset();
            showToast(`¡Bienvenido(a), ${profile.nombre}! Rol activo: ${profile.rol.toUpperCase()}`, "success");
        } catch (err) {
            renderFormErrors(errorBox, [err.message]);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Iniciar Sesión";
        }
    });

    // Envío de Registro con validación JS
    const registerForm = modalOverlay.querySelector("#bio-form-register");
    registerForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById("bio-auth-errors");
        const submitBtn = document.getElementById("btn-submit-register");

        const formData = {
            nombre: registerForm.nombre.value,
            pais: registerForm.pais.value,
            tipoPiel: registerForm.tipoPiel.value,
            email: registerForm.email.value,
            password: registerForm.password.value,
            confirmPassword: registerForm.confirmPassword.value
        };

        const validation = validateRegisterForm(formData);
        if (!validation.isValid) {
            renderFormErrors(errorBox, validation.errors);
            return;
        }

        try {
            errorBox.innerHTML = "";
            submitBtn.disabled = true;
            submitBtn.textContent = "Creando perfil en Bioaqua...";

            const profile = await registerUser(formData);
            setActiveRegion(profile.pais === "Guatemala" ? "GT" : "SV");

            closeAuthModal();
            registerForm.reset();
            showToast(
                `¡Cuenta creada con éxito, ${profile.nombre}! Se te asignó el rol '${profile.rol}'.`,
                "success"
            );
        } catch (err) {
            renderFormErrors(errorBox, [err.message]);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Crear mi cuenta Bioaqua";
        }
    });

    // Botones de acceso rápido para pruebas de cátedra
    modalOverlay.querySelector("#btn-demo-admin")?.addEventListener("click", () => {
        fillAndSubmitDemoLogin("admin@bioaqua.com", "admin123", {
            nombre: "Admin Regional Bioaqua",
            pais: "El Salvador",
            tipoPiel: "Mixta",
            rol: "admin"
        });
    });

    modalOverlay.querySelector("#btn-demo-client-sv")?.addEventListener("click", () => {
        fillAndSubmitDemoLogin("cliente@bioaqua.com", "cliente123", {
            nombre: "Camila Hernández",
            pais: "El Salvador",
            tipoPiel: "Mixta",
            rol: "cliente"
        });
    });

    modalOverlay.querySelector("#btn-demo-client-gt")?.addEventListener("click", () => {
        fillAndSubmitDemoLogin("sofia.gt@bioaqua.com", "cliente123", {
            nombre: "Sofía Morales",
            pais: "Guatemala",
            tipoPiel: "Seca",
            rol: "cliente"
        });
    });
}

/**
 * Inicia sesión con cuenta de demostración (si está en Firebase real y no existe aún, la registra).
 */
async function fillAndSubmitDemoLogin(email, password, fallbackInfo) {
    const loginForm = document.getElementById("bio-form-login");
    if (!loginForm) return;
    switchAuthTab("login");
    loginForm.email.value = email;
    loginForm.password.value = password;

    try {
        const profile = await loginUser({ email, password });
        if (fallbackInfo.rol === "admin" && profile.rol !== "admin") {
            await updateUserProfileData(profile.uid, { rol: "admin" });
        }
        setActiveRegion(fallbackInfo.pais === "Guatemala" ? "GT" : "SV");
        closeAuthModal();
        showToast(`Sesión iniciada como ${fallbackInfo.nombre} (${fallbackInfo.rol.toUpperCase()})`, "success");
    } catch (err) {
        // Si en Firebase real aún no se ha creado esa cuenta demo, registrarla al vuelo
        try {
            const created = await registerUser({
                nombre: fallbackInfo.nombre,
                email,
                password,
                pais: fallbackInfo.pais,
                tipoPiel: fallbackInfo.tipoPiel
            });
            if (fallbackInfo.rol === "admin") {
                await updateUserProfileData(created.uid, { rol: "admin" });
            }
            setActiveRegion(fallbackInfo.pais === "Guatemala" ? "GT" : "SV");
            closeAuthModal();
            showToast(`Cuenta demo creada e iniciada como ${fallbackInfo.rol.toUpperCase()}`, "success");
        } catch (regErr) {
            const errorBox = document.getElementById("bio-auth-errors");
            renderFormErrors(errorBox, [regErr.message]);
        }
    }
}

/**
 * Modal para pegar las credenciales de Firebase (`firebaseConfig`) en cualquier momento
 * sin necesidad de editar código si el equipo las obtiene justo antes de la defensa.
 */
function ensureFirebaseConfigModalInDOM() {
    if (document.getElementById("bio-fb-config-modal")) return;

    const currentCfg = getActiveFirebaseConfig();
    const isLive = isFirebaseConfigured();

    const overlay = document.createElement("div");
    overlay.id = "bio-fb-config-modal";
    overlay.className = "bio-modal-overlay";
    overlay.innerHTML = `
        <div class="bio-modal">
            <div class="bio-modal__header">
                <div>
                    <span class="bio-modal__eyebrow">CONEXIÓN BaaS (FIREBASE AUTH + FIRESTORE)</span>
                    <h3>Configuración de Credenciales Firebase</h3>
                </div>
                <button type="button" class="bio-modal__close" id="bio-fb-config-close">×</button>
            </div>
            <div class="bio-modal__body">
                <p class="bio-form-help" style="margin-bottom: 1rem;">
                    Estado actual: <strong>${isLive
            ? "Conectado a Firebase Cloud Firestore (" + escapeHTML(currentCfg.projectId) + ")"
            : "⚡ Modo Emulación Local Activo (Sin llaves aún)"
        }</strong>.<br>
                    Puedes colocar tus llaves en <code>js/config/firebaseConfig.js</code> o pegarlas aquí directamente:
                </p>
                <div id="bio-fb-config-errors" class="bio-form-errors"></div>
                <form id="bio-form-fb-config" class="bio-form">
                    <div class="bio-form-group">
                        <label for="fb-api-key">apiKey *</label>
                        <input type="text" id="fb-api-key" value="${escapeHTML(currentCfg.apiKey || "")}" placeholder="AIzaSy..." required>
                    </div>
                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="fb-project-id">projectId *</label>
                            <input type="text" id="fb-project-id" value="${escapeHTML(currentCfg.projectId || "")}" placeholder="mi-proyecto-bioaqua" required>
                        </div>
                        <div class="bio-form-group">
                            <label for="fb-auth-domain">authDomain *</label>
                            <input type="text" id="fb-auth-domain" value="${escapeHTML(currentCfg.authDomain || "")}" placeholder="mi-proyecto.firebaseapp.com" required>
                        </div>
                    </div>
                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="fb-app-id">appId *</label>
                            <input type="text" id="fb-app-id" value="${escapeHTML(currentCfg.appId || "")}" placeholder="1:123456:web:abcdef" required>
                        </div>
                        <div class="bio-form-group">
                            <label for="fb-storage">storageBucket (Opcional)</label>
                            <input type="text" id="fb-storage" value="${escapeHTML(currentCfg.storageBucket || "")}" placeholder="mi-proyecto.appspot.com">
                        </div>
                    </div>
                    <div class="bio-modal__footer" style="padding: 0.75rem 0 0 0;">
                        <button type="button" class="bio-btn bio-btn--outline" id="btn-reset-fb-demo">
                            Usar Modo Demo Local
                        </button>
                        <button type="submit" class="bio-btn bio-btn--primary">
                            Guardar y Conectar a Firebase
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#bio-fb-config-close")?.addEventListener("click", () => {
        overlay.classList.remove("active");
    });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.classList.remove("active");
    });

    overlay.querySelector("#bio-form-fb-config")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const apiKey = document.getElementById("fb-api-key").value.trim();
        const projectId = document.getElementById("fb-project-id").value.trim();
        const authDomain = document.getElementById("fb-auth-domain").value.trim();
        const appId = document.getElementById("fb-app-id").value.trim();
        const storageBucket = document.getElementById("fb-storage").value.trim();

        if (!apiKey || apiKey === "TU_API_KEY_AQUI" || !projectId) {
            renderFormErrors(document.getElementById("bio-fb-config-errors"), [
                "Ingresa un apiKey y projectId reales de tu consola de Firebase."
            ]);
            return;
        }

        saveCustomFirebaseConfig({
            apiKey,
            projectId,
            authDomain: authDomain || `${projectId}.firebaseapp.com`,
            appId,
            storageBucket: storageBucket || `${projectId}.appspot.com`
        });

        showToast("Credenciales guardadas. Recargando para conectar con Firebase...", "success", 1800);
        setTimeout(() => window.location.reload(), 900);
    });

    overlay.querySelector("#btn-reset-fb-demo")?.addEventListener("click", () => {
        clearCustomFirebaseConfig();
        showToast("Modo Demo Local activado. Recargando...", "info", 1500);
        setTimeout(() => window.location.reload(), 800);
    });
}

function openFirebaseConfigModal() {
    ensureFirebaseConfigModalInDOM();
    document.getElementById("bio-fb-config-modal")?.classList.add("active");
}

export function renderFormErrors(container, errors) {
    if (!container) return;
    if (!errors || errors.length === 0) {
        container.innerHTML = "";
        return;
    }
    container.innerHTML = `
        <ul class="bio-error-list">
            ${errors.map((err) => `<li>${escapeHTML(err)}</li>`).join("")}
        </ul>
    `;
}

export function escapeHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

