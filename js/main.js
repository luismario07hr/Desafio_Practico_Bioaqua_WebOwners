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
import { initConsultasForm } from "./consultas.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Inicializar barra de Autenticación, Roles y Selector Regional (SV/GT) en el Header
    initNavbarUI();

    // 2. Si estamos en `login.html` o `registro.html`, inicializar controladores de Autenticación
    initAuthPages();

    // 3. Si estamos en `productos.html`, inicializar el Catálogo Dinámico y Panel Admin
    if (document.querySelector("#catalog-root")) {
        await initCatalogPage();
    }

    // 4. Si estamos en `tipo-de-piel.html`, enriquecer las fichas con acceso directo al catálogo filtrado
    if (document.querySelector(".skin-tabs-container")) {
        enhanceSkinTypePage();
    }

    // 5. Si estamos en `contacto.html`, inicializar el formulario conectado a Firestore (`consultas`)
    if (document.querySelector(".form-container form")) {
        initConsultasForm();
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

