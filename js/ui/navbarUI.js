/**
 * ============================================================================
 * ARCHIVO: js/ui/navbarUI.js
 * RESPONSABILIDAD: Sincronización global del Navbar (<nav class="main-nav">)
 * en todas las páginas del sitio:
 * - Sin sesión: Botón "Iniciar Sesión / Registrarse" (login.html) en el nav.
 * - Con sesión activa: Nombre/correo del usuario, etiqueta de rol ('Admin' o 'Cliente'),
 *   acceso directo a su sección y botón funcional de "Cerrar Sesión" (Logout).
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
 * Inicializa el elemento de autenticación dentro de `<nav class="main-nav">` en cualquier página.
 */
export function initNavbarUI() {
    const navList = document.querySelector("header.header .main-nav ul");
    if (!navList) return;

    // Asegurar que exista el <li> de autenticación dentro del <nav>
    let navAuthItem = document.getElementById("nav-auth-item");
    if (!navAuthItem) {
        navAuthItem = document.createElement("li");
        navAuthItem.id = "nav-auth-item";
        navList.appendChild(navAuthItem);
    }

    // Renderizar estado inicial (sin sesión mientras Firebase resuelve el estado)
    renderNavAuthItem(navAuthItem, null);

    // Suscribirse en tiempo real a cambios de autenticación en Firebase
    subscribeToAuthChanges((userProfile) => {
        if (userProfile && userProfile.pais === "Guatemala" && !localStorage.getItem(REGION_STORAGE_KEY)) {
            setActiveRegion("GT");
        }
        renderNavAuthItem(navAuthItem, userProfile);
    });
}

/**
 * Renderiza dinámicamente el ítem del Navbar según el estado de sesión y rol.
 * @param {HTMLElement} navAuthItem Elemento <li id="nav-auth-item"> dentro del nav
 * @param {Object|null} user Perfil del usuario autenticado o null
 */
function renderNavAuthItem(navAuthItem, user) {
    const currentPath = window.location.pathname.toLowerCase();
    const isAuthPage =
        currentPath.endsWith("login.html") ||
        currentPath.endsWith("/login") ||
        currentPath.endsWith("registro.html") ||
        currentPath.endsWith("/registro");

    if (!user) {
        // SIN SESIÓN: Mostrar el botón "Iniciar Sesión / Registrarse" integrado en el nav
        navAuthItem.innerHTML = `
            <a href="login.html" class="nav-auth-btn ${isAuthPage ? "active" : ""}">
                Iniciar Sesión / Registrarse
            </a>
        `;
    } else {
        // CON SESIÓN ACTIVA: Mostrar nombre, rol ('Admin' o 'Cliente'), acceso a su sección y botón "Cerrar Sesión"
        const isAdmin = user.rol === "admin";
        const displayIdentity = user.nombre || user.email || "Usuario";
        const roleBadge = isAdmin
            ? `<span class="bio-role-badge bio-role-badge--admin">Admin</span>`
            : `<span class="bio-role-badge bio-role-badge--client">Cliente</span>`;

        navAuthItem.innerHTML = `
            <div class="nav-user-session">
                <a href="${isAdmin ? "dashboard-admin.html" : "productos.html#mi-rutina-section"}" class="nav-user-link" title="Ir a ${isAdmin ? "Dashboard Admin" : "Mi Rutina"}">
                    <span class="bio-user-name">${escapeHTML(displayIdentity)}</span>
                    ${roleBadge}
                </a>
                <a href="${isAdmin ? "dashboard-admin.html" : "productos.html#mi-rutina-section"}" class="bio-btn bio-btn--cyan bio-btn--xs">
                    ${isAdmin ? "📊 Dashboard Admin" : "🧴 Mi Rutina"}
                </a>
                <button type="button" class="bio-btn bio-btn--outline-light bio-btn--xs" id="btn-header-logout">
                    Salir
                </button>
            </div>
        `;

        // Evento funcional de Cerrar Sesión (Logout)
        navAuthItem.querySelector("#btn-header-logout")?.addEventListener("click", async () => {
            try {
                await logoutUser();
                showToast("Has cerrado sesión correctamente.", "info");
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }
}

/**
 * Redirige a la página dedicada de Login o Registro cuando un componente solicita autenticación.
 * @param {'login'|'register'} tab
 */
export function openAuthModal(tab = "login") {
    if (tab === "register") {
        window.location.href = "registro.html";
    } else {
        window.location.href = "login.html";
    }
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
