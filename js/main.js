/**
 * ============================================================================
 * ARCHIVO: js/main.js
 * RESPONSABILIDAD: Punto de entrada principal modular (ES Modules).
 * Inicializa la barra de sesión/región en todas las vistas y activa los
 * controladores específicos según la página actual.
 * ============================================================================
 */

import { initNavbarUI } from "./ui/navbarUI.js";
import { initAuthPages } from "./ui/auth-pages.js";
import { initCatalogPage } from "./ui/catalogUI.js";
import { showToast } from "./ui/notificationsUI.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicializar barra de Autenticación, Roles y Selector Regional (SV/GT) en el Header
    initNavbarUI();

    // 2. Si estamos en `login.html` o `registro.html`, inicializar controladores de Autenticación
    initAuthPages();

    // 3. Si estamos en `productos.html`, inicializar el Catálogo Dinámico, Panel Admin y Mi Rutina
    if (document.querySelector(".products-main-container")) {
        await initCatalogPage();
    }

    // 4. Si estamos en `tipo-de-piel.html`, enriquecer las fichas con acceso directo al catálogo filtrado
    if (document.querySelector(".skin-tabs-container")) {
        enhanceSkinTypePage();
    }

    // 5. Si estamos en `contacto.html`, validar el formulario con JS sin recargar la página
    if (document.querySelector(".form-container form")) {
        enhanceContactForm();
    }
});

/**
 * Conecta las pestañas de `tipo-de-piel.html` con el filtro dinámico de `productos.html`.
 */
function enhanceSkinTypePage() {
    const skinMap = [
        { id: "content-acne", piel: "Grasa", label: "Ver productos para Piel con Acné / Grasa en el Catálogo" },
        { id: "content-grasa", piel: "Grasa", label: "Ver productos para Piel Grasa en el Catálogo" },
        { id: "content-seca", piel: "Seca", label: "Ver productos para Piel Seca en el Catálogo" },
        { id: "content-manchas", piel: "Mixta", label: "Ver productos Despigmentantes / Piel Mixta en el Catálogo" }
    ];

    skinMap.forEach(({ id, piel, label }) => {
        const article = document.getElementById(id);
        const infoBox = article?.querySelector(".content-box.bg-white");
        if (!infoBox) return;

        const catalogLink = document.createElement("a");
        catalogLink.href = `productos.html?piel=${encodeURIComponent(piel)}`;
        catalogLink.className = "bio-skin-catalog-cta";
        catalogLink.style.marginLeft = "0.5rem";
        catalogLink.style.backgroundColor = "var(--color-celeste)";
        catalogLink.textContent = `🧴 ${label}`;
        infoBox.appendChild(catalogLink);
    });
}

/**
 * Añade validación personalizada en JS al formulario de `contacto.html`.
 */
function enhanceContactForm() {
    const form = document.querySelector(".form-container form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = form.nombre?.value.trim() || "";
        const email = form.email?.value.trim() || "";
        const celular = form.celular?.value.trim() || "";
        const codigoPais = form.codigo_pais?.value || "+503";
        const asunto = form.asunto?.value.trim() || "";
        const mensaje = form.mensaje?.value.trim() || "";

        if (nombre.length < 3) {
            showToast("Por favor ingresa tu nombre completo (mínimo 3 caracteres).", "warning");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
            showToast("Ingresa un correo electrónico válido.", "warning");
            return;
        }
        if (!/^[0-9]{8}$/.test(celular.replace(/\s+/g, ""))) {
            showToast("Ingresa un número de celular válido de 8 dígitos para SV o GT.", "warning");
            return;
        }
        if (asunto.length < 4 || mensaje.length < 10) {
            showToast("Completa el asunto y un mensaje de al menos 10 caracteres.", "warning");
            return;
        }

        const paisNombre = codigoPais === "+502" ? "Guatemala" : "El Salvador";
        showToast(
            `¡Gracias, ${nombre}! Tu solicitud desde ${paisNombre} ha sido registrada por el equipo de Bioaqua.`,
            "success",
            5000
        );
        form.reset();
    });
}
