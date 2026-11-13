/**
 * ============================================================================
 * ARCHIVO: js/ui/auth-pages.js
 * RESPONSABILIDAD: Controlador modular para las páginas dedicadas de
 * Inicio de Sesión (login.html) y Registro de Usuario (registro.html).
 * - Validaciones en el cliente con mensajes específicos debajo de cada input.
 * - Asincronía (async/await + try/catch) con estados de carga dinámicos.
 * - Traducción y visualización de errores de Firebase Auth en español.
 * - Protección de rutas y redirección inteligente según rol ('admin' o 'cliente').
 * ============================================================================
 */

import {
    loginUser,
    registerUser,
    subscribeToAuthChanges
} from "../services/authService.js";
import { PAISES_VALIDOS, TIPOS_PIEL_VALIDOS } from "../utils/validators.js";
import { setActiveRegion, escapeHTML } from "./navbarUI.js";
import { showToast } from "./notificationsUI.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Bandera para evitar que el observador redirija prematuramente antes de mostrar el mensaje de éxito del formulario
let isSubmittingAuthForm = false;

/**
 * Inicializa la lógica de `login.html` o `registro.html` si sus formularios están presentes.
 */
export function initAuthPages() {
    const loginPageForm = document.getElementById("page-form-login");
    const registerPageForm = document.getElementById("page-form-register");

    if (!loginPageForm && !registerPageForm) return;

    // 1. Configurar botones de Mostrar / Ocultar contraseña
    initPasswordVisibilityToggles();

    // 2. Protección de ruta: si el usuario ya tiene sesión activa al abrir login.html o registro.html, redirigirlo
    subscribeToAuthChanges((userProfile) => {
        if (userProfile && !isSubmittingAuthForm) {
            const targetUrl = getRedirectUrlByRole(userProfile.rol);
            showAuthAlert(
                "info",
                `Ya has iniciado sesión como <strong>${escapeHTML(userProfile.nombre || userProfile.email)}</strong> (${escapeHTML((userProfile.rol || "cliente").toUpperCase())}). Redirigiendo...`
            );
            setTimeout(() => {
                window.location.replace(targetUrl);
            }, 900);
        }
    });

    // 3. Inicializar controlador específico según la página activa
    if (loginPageForm) {
        setupLoginForm(loginPageForm);
    }

    if (registerPageForm) {
        setupRegisterForm(registerPageForm);
    }
}

/**
 * Determina la ruta de destino según el rol almacenado en Firestore.
 * @param {string} rol 'admin' | 'cliente'
 * @returns {string} URL relativa de destino
 */
function getRedirectUrlByRole(rol) {
    if (rol === "admin") {
        return "productos.html#panel-admin";
    }
    return "productos.html#mi-rutina-section";
}

// ============================================================================
// CONTROLADOR DE INICIO DE SESIÓN (login.html)
// ============================================================================

function setupLoginForm(form) {
    const emailInput = form.querySelector("#login-page-email");
    const passwordInput = form.querySelector("#login-page-password");
    const submitBtn = form.querySelector("#btn-page-login");

    // Limpiar errores individuales al escribir
    attachLiveClearError(emailInput, "error-login-email");
    attachLiveClearError(passwordInput, "error-login-password");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearAuthAlert();

        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        // 1. Validación por campo en el cliente (sin alert() nativo)
        let isValid = true;

        if (!email) {
            setFieldError(emailInput, "error-login-email", "El correo electrónico es obligatorio.");
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError(
                emailInput,
                "error-login-email",
                "Ingresa un correo electrónico válido (ejemplo: usuario@bioaqua.com)."
            );
            isValid = false;
        } else {
            clearFieldError(emailInput, "error-login-email");
        }

        if (!password) {
            setFieldError(passwordInput, "error-login-password", "Debes ingresar tu contraseña.");
            isValid = false;
        } else if (password.length < 6) {
            setFieldError(
                passwordInput,
                "error-login-password",
                "La contraseña debe tener al menos 6 caracteres."
            );
            isValid = false;
        } else {
            clearFieldError(passwordInput, "error-login-password");
        }

        if (!isValid) return;

        // 2. Petición asíncrona a Firebase Auth + Firestore
        try {
            isSubmittingAuthForm = true;
            setSubmitLoadingState(submitBtn, true, "Iniciando sesión...", "Iniciar Sesión");

            const profile = await loginUser({ email, password });

            // Sincronizar país activo con el perfil del usuario
            if (profile.pais === "Guatemala") setActiveRegion("GT");
            if (profile.pais === "El Salvador") setActiveRegion("SV");

            const roleLabel = (profile.rol || "cliente").toUpperCase();
            const redirectUrl = getRedirectUrlByRole(profile.rol);

            showAuthAlert(
                "success",
                `¡Bienvenido(a), <strong>${escapeHTML(profile.nombre)}</strong>! Sesión iniciada con rol <strong>${escapeHTML(roleLabel)}</strong>. Redirigiendo a tu panel...`
            );
            showToast(`¡Bienvenido(a), ${profile.nombre}! (${roleLabel})`, "success", 3000);

            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1100);
        } catch (error) {
            isSubmittingAuthForm = false;
            const friendlyMessage = formatFirebaseAuthError(error);
            showAuthAlert("error", friendlyMessage);
            setSubmitLoadingState(submitBtn, false, "Iniciando sesión...", "Iniciar Sesión");
        }
    });
}

// ============================================================================
// CONTROLADOR DE REGISTRO DE USUARIO (registro.html)
// ============================================================================

function setupRegisterForm(form) {
    const nombreInput = form.querySelector("#reg-page-nombre");
    const emailInput = form.querySelector("#reg-page-email");
    const paisSelect = form.querySelector("#reg-page-pais");
    const pielSelect = form.querySelector("#reg-page-piel");
    const passwordInput = form.querySelector("#reg-page-password");
    const confirmInput = form.querySelector("#reg-page-confirm");
    const submitBtn = form.querySelector("#btn-page-register");

    // Limpiar errores individuales en tiempo real cuando el usuario corrige un campo
    attachLiveClearError(nombreInput, "error-reg-nombre");
    attachLiveClearError(emailInput, "error-reg-email");
    attachLiveClearError(paisSelect, "error-reg-pais", "change");
    attachLiveClearError(pielSelect, "error-reg-piel", "change");
    attachLiveClearError(passwordInput, "error-reg-password");
    attachLiveClearError(confirmInput, "error-reg-confirm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        clearAuthAlert();

        const nombre = (nombreInput?.value || "").trim();
        const email = (emailInput?.value || "").trim();
        const pais = (paisSelect?.value || "").trim();
        const tipoPiel = (pielSelect?.value || "").trim();
        const password = passwordInput?.value || "";
        const confirmPassword = confirmInput?.value || "";

        // 1. Validación detallada por campo en el cliente
        let isValid = true;

        if (!nombre) {
            setFieldError(nombreInput, "error-reg-nombre", "El nombre completo es obligatorio.");
            isValid = false;
        } else if (nombre.length < 3) {
            setFieldError(
                nombreInput,
                "error-reg-nombre",
                "El nombre completo debe tener al menos 3 caracteres."
            );
            isValid = false;
        } else {
            clearFieldError(nombreInput, "error-reg-nombre");
        }

        if (!email) {
            setFieldError(emailInput, "error-reg-email", "El correo electrónico es obligatorio.");
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError(
                emailInput,
                "error-reg-email",
                "Ingresa un correo electrónico con formato válido (ej. nombre@dominio.com)."
            );
            isValid = false;
        } else {
            clearFieldError(emailInput, "error-reg-email");
        }

        if (!PAISES_VALIDOS.includes(pais)) {
            setFieldError(paisSelect, "error-reg-pais", "Selecciona tu país de residencia (El Salvador o Guatemala).");
            isValid = false;
        } else {
            clearFieldError(paisSelect, "error-reg-pais");
        }

        if (!TIPOS_PIEL_VALIDOS.includes(tipoPiel)) {
            setFieldError(pielSelect, "error-reg-piel", "Selecciona tu tipo de piel.");
            isValid = false;
        } else {
            clearFieldError(pielSelect, "error-reg-piel");
        }

        if (!password) {
            setFieldError(passwordInput, "error-reg-password", "Debes crear una contraseña.");
            isValid = false;
        } else if (password.length < 6) {
            setFieldError(
                passwordInput,
                "error-reg-password",
                "La contraseña debe tener un mínimo de 6 caracteres."
            );
            isValid = false;
        } else {
            clearFieldError(passwordInput, "error-reg-password");
        }

        if (!confirmPassword) {
            setFieldError(confirmInput, "error-reg-confirm", "Por favor confirma tu contraseña.");
            isValid = false;
        } else if (password !== confirmPassword) {
            setFieldError(
                confirmInput,
                "error-reg-confirm",
                "Las contraseñas no coinciden. Verifica que ambas sean idénticas."
            );
            isValid = false;
        } else {
            clearFieldError(confirmInput, "error-reg-confirm");
        }

        if (!isValid) return;

        // 2. Registro asíncrono en Firebase Auth + Firestore (asigna rol 'cliente' automáticamente)
        try {
            isSubmittingAuthForm = true;
            setSubmitLoadingState(submitBtn, true, "Creando cuenta...", "Crear mi cuenta Bioaqua");

            const profile = await registerUser({
                nombre,
                email,
                password,
                pais,
                tipoPiel
            });

            setActiveRegion(profile.pais === "Guatemala" ? "GT" : "SV");

            const redirectUrl = getRedirectUrlByRole(profile.rol);

            showAuthAlert(
                "success",
                `¡Cuenta creada con éxito, <strong>${escapeHTML(profile.nombre)}</strong>! Se te ha asignado el rol <strong>CLIENTE</strong>. Redirigiendo a tu armador de rutina...`
            );
            showToast(
                `¡Bienvenido(a) a Bioaqua, ${profile.nombre}! Cuenta registrada con rol Cliente.`,
                "success",
                3200
            );

            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1200);
        } catch (error) {
            isSubmittingAuthForm = false;
            const friendlyMessage = formatFirebaseAuthError(error);
            showAuthAlert("error", friendlyMessage);
            setSubmitLoadingState(submitBtn, false, "Creando cuenta...", "Crear mi cuenta Bioaqua");
        }
    });
}

// ============================================================================
// UTILIDADES DE MANIPULACIÓN DEL DOM (Errores por campo, Alertas y Spinners)
// ============================================================================

/**
 * Muestra un mensaje de error debajo de un input específico y resalta el borde.
 */
function setFieldError(inputEl, errorElementId, message) {
    if (inputEl) {
        inputEl.classList.remove("input-valid");
        inputEl.classList.add("input-invalid");
        inputEl.setAttribute("aria-invalid", "true");
    }
    const errEl = document.getElementById(errorElementId);
    if (errEl) {
        errEl.textContent = message;
        errEl.classList.add("visible");
    }
}

/**
 * Limpia el error de un input específico.
 */
function clearFieldError(inputEl, errorElementId) {
    if (inputEl) {
        inputEl.classList.remove("input-invalid");
        inputEl.classList.add("input-valid");
        inputEl.removeAttribute("aria-invalid");
    }
    const errEl = document.getElementById(errorElementId);
    if (errEl) {
        errEl.textContent = "";
        errEl.classList.remove("visible");
    }
}

function attachLiveClearError(inputEl, errorElementId, eventName = "input") {
    if (!inputEl) return;
    inputEl.addEventListener(eventName, () => {
        if (inputEl.classList.contains("input-invalid")) {
            inputEl.classList.remove("input-invalid");
            const errEl = document.getElementById(errorElementId);
            if (errEl) {
                errEl.textContent = "";
                errEl.classList.remove("visible");
            }
        }
    });
}

/**
 * Activa o desactiva los botones de Mostrar/Ocultar contraseña usando delegación de eventos.
 */
let passwordTogglesBound = false;
function initPasswordVisibilityToggles() {
    if (passwordTogglesBound) return;
    passwordTogglesBound = true;

    document.addEventListener("click", (e) => {
        if (e.defaultPrevented) return;
        const btn = e.target.closest(".password-toggle-btn");
        if (!btn) return;

        e.preventDefault();
        const targetId = btn.getAttribute("data-target");
        const input = targetId
            ? document.getElementById(targetId)
            : btn.parentElement?.querySelector("input");

        if (!input) return;

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.textContent = isPassword ? "Ocultar" : "Mostrar";
        btn.setAttribute(
            "aria-label",
            isPassword ? "Ocultar contraseña" : "Mostrar contraseña"
        );
    });
}

/**
 * Cambia el estado del botón de envío durante una petición asíncrona.
 */
function setSubmitLoadingState(button, isLoading, loadingText, defaultText) {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `<span class="btn-inline-spinner" aria-hidden="true"></span> <span>${escapeHTML(loadingText)}</span>`;
    } else {
        button.textContent = defaultText;
    }
}

/**
 * Muestra un contenedor de alerta general dentro del formulario (error, éxito o info).
 */
function showAuthAlert(type, htmlMessage) {
    const container = document.getElementById("auth-alert-container");
    if (!container) return;

    const icon = type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
    container.innerHTML = `
        <div class="auth-alert auth-alert--${type}" role="alert">
            <span aria-hidden="true">${icon}</span>
            <div>${htmlMessage}</div>
        </div>
    `;
}

function clearAuthAlert() {
    const container = document.getElementById("auth-alert-container");
    if (container) container.innerHTML = "";
}

/**
 * Traduce cualquier código de error de Firebase Auth a un mensaje claro en español.
 */
function formatFirebaseAuthError(error) {
    const code = error?.code || "";
    const map = {
        "auth/invalid-credential":
            "Correo electrónico o contraseña incorrectos. Verifica tus datos e intenta de nuevo.",
        "auth/user-not-found":
            "No encontramos ninguna cuenta registrada con ese correo electrónico.",
        "auth/wrong-password":
            "La contraseña ingresada es incorrecta.",
        "auth/email-already-in-use":
            "Este correo electrónico ya está registrado en Bioaqua. Por favor inicia sesión.",
        "auth/weak-password":
            "La contraseña es demasiado débil. Debe contener al menos 6 caracteres.",
        "auth/invalid-email":
            "El formato del correo electrónico no es válido.",
        "auth/network-request-failed":
            "Error de conexión a internet. Verifica tu red e inténtalo nuevamente.",
        "auth/too-many-requests":
            "Se han realizado demasiados intentos fallidos. Espera unos minutos antes de reintentar."
    };

    if (map[code]) {
        return escapeHTML(map[code]);
    }
    return escapeHTML(error?.message || "Ocurrió un error inesperado al procesar la solicitud.");
}

