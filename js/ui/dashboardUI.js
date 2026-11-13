/**
 * ============================================================================
 * ARCHIVO: js/ui/dashboardUI.js
 * RESPONSABILIDAD: Lógica del Panel de Administración (dashboard-admin.html)
 * - Protección de ruta: Solo usuarios autenticados con rol === 'admin'.
 * - Carga de métricas globales (productos, usuarios, rutinas, reseñas).
 * - Renderizado y gestión CRUD de productos con modales y confirmaciones.
 * - Navegación lateral entre secciones (Resumen, Productos, Usuarios).
 * ============================================================================
 */

import { auth, db } from "../config/firebaseConfig.js";
import {
    subscribeToAuthChanges,
    logoutUser,
    getAllUsers
} from "../services/authService.js";
import {
    getAllProducts,
    seedProductsToFirestore
} from "../services/productService.js";
import {
    getAllReviews,
    seedReviewsAndRoutines
} from "../services/routineService.js";
import { openProductModal, handleDeleteProduct } from "./adminUI.js";
import { showToast, confirmDialog } from "./notificationsUI.js";
import { escapeHTML } from "./navbarUI.js";

// Cache de productos para acciones de edición y eliminación
let cachedProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("loader");
    const dashboard = document.getElementById("admin-dashboard");
    const adminEmailSpan = document.getElementById("admin-email");

    // 1. PROTECCIÓN DE RUTA Y AUTORIZACIÓN
    subscribeToAuthChanges(async (userProfile) => {
        if (!userProfile) {
            // Sin sesión: redirigir a inicio de sesión
            showToast("Debes iniciar sesión con una cuenta de Administrador.", "warning");
            setTimeout(() => {
                window.location.replace("login.html");
            }, 500);
            return;
        }

        if (userProfile.rol !== "admin") {
            // Usuario con sesión pero rol diferente a admin
            if (loader) loader.style.display = "none";
            alert("Acceso denegado: Se requieren permisos de Administrador para ver este panel.");
            window.location.replace("index.html");
            return;
        }

        // Es Administrador verificado
        if (loader) loader.style.display = "none";
        if (dashboard) dashboard.style.display = "flex";
        if (adminEmailSpan) {
            adminEmailSpan.textContent = userProfile.email || userProfile.nombre || "admin@bioaqua.com";
        }

        // Cargar métricas y tablas iniciales
        await cargarDatosDashboard();
    });

    // 2. LÓGICA DE NAVEGACIÓN (SIDEBAR)
    const navLinks = document.querySelectorAll(".sidebar-nav a[data-section]");
    const sections = document.querySelectorAll(".content-section");
    const pageTitle = document.getElementById("page-title");

    navLinks.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach((l) => l.classList.remove("active"));
            link.classList.add("active");

            sections.forEach((s) => (s.style.display = "none"));
            const sectionId = `section-${link.dataset.section}`;
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = "block";
            }

            if (pageTitle) {
                pageTitle.textContent = link.textContent.replace(/[^\w\s]/gi, "").trim();
            }
        });
    });

    // 3. CERRAR SESIÓN
    document.getElementById("btn-logout-admin")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            await logoutUser();
            showToast("Sesión cerrada correctamente.", "info");
            setTimeout(() => {
                window.location.replace("index.html");
            }, 300);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            window.location.replace("index.html");
        }
    });

    // 4. BOTÓN NUEVO PRODUCTO (Abre modal CRUD oficial)
    document.getElementById("btn-add-product")?.addEventListener("click", () => {
        openProductModal(null, cargarDatosDashboard);
    });

    // 5. BOTÓN SEED / RESTAURAR DATOS
    document.getElementById("btn-seed-catalog")?.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
            title: "Restaurar Catálogo Oficial (Seed)",
            message: "¿Deseas recargar los productos, reseñas y rutinas iniciales oficiales?",
            confirmText: "Restaurar Datos",
            cancelText: "Cancelar"
        });

        if (!confirmed) return;

        try {
            showToast("Restaurando datos iniciales...", "info");
            await seedProductsToFirestore();
            await seedReviewsAndRoutines();
            showToast("Catálogo inicial restaurado con éxito.", "success");
            await cargarDatosDashboard();
        } catch (error) {
            console.error("Error en seed:", error);
            showToast("Error al restaurar catálogo inicial.", "error");
        }
    });
});

/**
 * Consulta las colecciones principales de Firestore y actualiza el Dashboard.
 */
export async function cargarDatosDashboard() {
    try {
        const [products, users, reviews] = await Promise.all([
            getAllProducts(),
            getAllUsers(),
            getAllReviews()
        ]);

        cachedProducts = products;

        // Actualizar Tarjetas de Métricas
        const elMetricProducts = document.getElementById("metric-products");
        const elMetricUsers    = document.getElementById("metric-users");
        const elMetricReviews  = document.getElementById("metric-reviews");

        if (elMetricProducts) elMetricProducts.textContent = products.length;
        if (elMetricUsers)    elMetricUsers.textContent = users.length;
        if (elMetricReviews)  elMetricReviews.textContent = reviews.length;

        // Llenar la Tabla de Productos
        renderProductsTable(products);

        // Llenar la Tabla de Usuarios (si existe)
        renderUsersTable(users);

    } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
        showToast("Error al cargar los datos del dashboard.", "error");
    }
}

/**
 * Renderiza la tabla de productos del catálogo.
 * @param {Array<Object>} products
 */
function renderProductsTable(products) {
    const tbody = document.getElementById("table-products-body");
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: #888;">
                    No hay productos en el catálogo. Usa "+ Nuevo Producto" para agregar uno.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map((prod) => {
        const stockStyle =
            prod.stockEstado === "En Stock"
                ? "background: #e8f5e9; color: #2e7d32;"
                : prod.stockEstado === "Stock Bajo"
                ? "background: #fff3e0; color: #ef6c00;"
                : "background: #ffebee; color: #c62828;";

        return `
            <tr>
                <td><span style="font-size: 0.8em; color: #888;">${escapeHTML(prod.id ? prod.id.substring(0, 8) : "—")}</span></td>
                <td>
                    <strong>${escapeHTML(prod.nombre || "Sin nombre")}</strong>
                    ${prod.destacado ? ' <span style="font-size:0.75rem; color:#f59e0b;">⭐ Top</span>' : ""}
                </td>
                <td>$${Number(prod.precioReferenciaUSD || 0).toFixed(2)} USD</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.82em; font-weight: 600; ${stockStyle}">
                        ${escapeHTML(prod.stockEstado || "Sin estado")}
                    </span>
                </td>
                <td>${escapeHTML(prod.disponibilidadPais || "Ambos")}</td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--cyan" onclick="window.editarProducto('${prod.id}')">✎ Editar</button>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--danger" onclick="window.eliminarProducto('${prod.id}')">🗑 Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    // Exponer funciones globales para los botones de la tabla
    window.editarProducto = (id) => {
        const prod = cachedProducts.find((p) => p.id === id);
        if (prod) {
            openProductModal(prod, cargarDatosDashboard);
        }
    };

    window.eliminarProducto = (id) => {
        const prod = cachedProducts.find((p) => p.id === id);
        if (prod) {
            handleDeleteProduct(prod, cargarDatosDashboard);
        }
    };
}

/**
 * Renderiza la tabla de usuarios registrados.
 * @param {Array<Object>} users
 */
function renderUsersTable(users) {
    const tbody = document.getElementById("table-users-body");
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: #888;">
                    No hay usuarios registrados en el sistema.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map((u) => `
        <tr>
            <td><strong>${escapeHTML(u.nombre || "Usuario")}</strong></td>
            <td>${escapeHTML(u.email || "—")}</td>
            <td>${escapeHTML(u.pais || "—")}</td>
            <td>${escapeHTML(u.tipoPiel || "—")}</td>
            <td>
                <span style="padding: 3px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600;
                    background: ${u.rol === "admin" ? "#e3f2fd" : "#f1f5f9"};
                    color: ${u.rol === "admin" ? "#1976d2" : "#475569"};">
                    ${escapeHTML((u.rol || "cliente").toUpperCase())}
                </span>
            </td>
        </tr>
    `).join("");
}

