/**
 * ============================================================================
 * ARCHIVO: js/ui/navbarUI.js
 * RESPONSABILIDAD: Barra de navegación global, selector regional (SV / GT)
 * y estado visual de sesión de usuario con Firebase.
 * ============================================================================
 */

import {
    logoutUser,
    subscribeToAuthChanges
} from "../services/authService.js";
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
 * Inicializa la barra de sesión en el `<header>` de cualquier página.
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

    // 2. Suscribirse a cambios de autenticación en Firebase
    subscribeToAuthChanges((userProfile) => {
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
 * Renderiza dinámicamente los controles del Header según el estado del usuario en Firebase.
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
        // Visitante no autenticado: mostrar enlace en el menú principal hacia login.html
        if (navAuthItem) {
            navAuthItem.style.display = "";
            const authLink = navAuthItem.querySelector("a");
            if (authLink) authLink.setAttribute("href", "login.html");
        }

        // En la barra derecha solo mostramos el selector regional
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
                <a href="${isAdmin ? "dashboard-admin.html" : "productos.html"}" class="bio-user-info" title="${isAdmin ? "Ir a Panel de Administración" : "Ir al Catálogo de Productos"}" style="text-decoration:none; cursor:pointer;">
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
    // Redirección nativa en uso
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
