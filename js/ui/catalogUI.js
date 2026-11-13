/**
 * ============================================================================
 * ARCHIVO: js/ui/catalogUI.js
 * RESPONSABILIDAD: Renderizado 100% dinámico del Catálogo de Productos Bioaqua
 * desde Firestore (Cero catálogo estático), barra de búsqueda y filtrado
 * multicriterio en tiempo real, ordenamiento, reseñas de clientes y controles
 * CRUD exclusivos para el rol Administrador.
 * ============================================================================
 */

import { getAllProducts } from "../services/productService.js";
import { getAllReviews } from "../services/routineService.js";
import { subscribeToAuthChanges, getCurrentUser } from "../services/authService.js";
import {
    filterProducts,
    sortProducts,
    enrichProductsWithRatings,
    calculateCatalogMetrics
} from "../utils/dataProcessor.js";
import {
    CATEGORIAS_VALIDAS,
    TIPOS_PIEL_VALIDOS,
    LINEAS_BIOAQUA
} from "../utils/validators.js";
import { renderLoadingState, renderEmptyState, showToast } from "./notificationsUI.js";
import { renderAdminPanel, openProductModal, handleDeleteProduct } from "./adminUI.js";
import { openProductReviewsModal } from "./clientRoutineUI.js";
import { getActiveRegion, escapeHTML } from "./navbarUI.js";

// Estado reactivo del catálogo en memoria para filtrado y ordenamiento instantáneo
let rawProducts = [];
let allReviews = [];
let enrichedProducts = [];

const currentFilters = {
    search: "",
    pais: "Todos",
    categoria: "Todas",
    tipoPiel: "Todas",
    linea: "Todas",
    stockEstado: "Todos",
    sortBy: "destacados"
};

/**
 * Normaliza rutas de imágenes locales por si en Firestore quedó guardada la variante sin "(1)".
 */
function normalizeImageUrl(url) {
    if (!url) return "img/suero-acido-hialuronico-clean.png";
    if (url === "img/proteina-de-seda-clean.png") {
        return "img/proteina-de-seda-clean (1).png";
    }
    return url;
}

/**
 * Formatea el precio del producto según la región activa (USD para SV, GTQ para GT).
 */
function formatProductPrice(prod, activeRegion = "SV") {
    const usd = Number(prod.precioReferenciaUSD ?? prod.precio ?? 0);
    const gtq = Number(prod.precioReferenciaGTQ ?? (usd * 7.8));

    if (activeRegion === "GT" && gtq > 0) {
        return `Q${gtq.toFixed(2)}`;
    }
    if (usd > 0) {
        return `$${usd.toFixed(2)}`;
    }
    return "Consultar precio";
}

/**
 * Inicializa la página interactiva de Productos (`productos.html`).
 */
export async function initCatalogPage() {
    const mainContainer = document.querySelector(".products-main-container");
    if (!mainContainer) return;

    // 1. Leer parámetros de URL si el usuario viene desde "Tu tipo de piel" (ej. productos.html?piel=Grasa)
    const params = new URLSearchParams(window.location.search);
    const skinParam = params.get("piel");
    if (skinParam && TIPOS_PIEL_VALIDOS.includes(skinParam)) {
        currentFilters.tipoPiel = skinParam;
    }

    // 2. Preparar contenedores estructurales en `productos.html`
    mainContainer.innerHTML = `
        <!-- 1. PANEL EXCLUSIVO ROL ADMIN (Proceso 1) -->
        <section id="admin-panel-mount" class="hidden" aria-label="Panel de Administración"></section>

        <!-- 2. BARRA DE FILTROS AVANZADOS EN TIEMPO REAL -->
        <section id="catalog-filters-mount" class="bio-filters-section" aria-label="Filtros y búsqueda del catálogo"></section>

        <!-- 3. SECCIÓN DINÁMICA: BEST SELLERS -->
        <section id="best-sellers-section">
            <h2>Best sellers</h2>
            <div id="best-sellers-dynamic-grid" class="best-sellers-grid"></div>
        </section>

        <!-- 4. SECCIÓN DINÁMICA: CATÁLOGO DE PRODUCTOS POR CATEGORÍA / FILTROS -->
        <section id="all-products-section">
            <div id="catalog-dynamic-container"></div>
        </section>
    `;

    // Renderizar la barra de controles de filtrado una sola vez
    renderFilterControls(document.getElementById("catalog-filters-mount"));

    // Cargar datos iniciales desde Firestore con estado de carga visual (Skeletons)
    await reloadCatalogAndReviews();

    // Suscribirse a cambios de sesión (Login/Logout/Cambio de Rol) para actualizar vistas sin recargar
    subscribeToAuthChanges((userProfile) => {
        refreshAllCatalogViews(userProfile);
    });

    // Escuchar cambio de región (SV / GT) en el Header para actualizar precios y ordenamiento
    window.addEventListener("bioaqua:regionChanged", () => {
        refreshAllCatalogViews(getCurrentUser());
    });
}

/**
 * Consulta asíncronamente `productos` y `resenas` en Firestore (`async/await` + `try/catch`).
 */
export async function reloadCatalogAndReviews() {
    const catalogMount = document.getElementById("catalog-dynamic-container");
    const bestSellersMount = document.getElementById("best-sellers-dynamic-grid");

    try {
        renderLoadingState(catalogMount, "Sincronizando catálogo Bioaqua desde Firestore...", 6);
        if (bestSellersMount) bestSellersMount.innerHTML = "";

        const [productsData, reviewsData] = await Promise.all([
            getAllProducts(),
            getAllReviews()
        ]);

        rawProducts = productsData;
        allReviews = reviewsData;
        enrichedProducts = enrichProductsWithRatings(rawProducts, allReviews);

        const user = getCurrentUser();
        refreshAllCatalogViews(user);
    } catch (error) {
        console.error("Error cargando catálogo:", error);
        showToast(error.message || "Error al conectar con el catálogo.", "error");
        renderEmptyState(catalogMount, {
            icon: "⚠️",
            title: "No se pudo cargar el catálogo en este momento",
            message: error.message || "Verifica tu conexión e intenta nuevamente.",
            actionText: "Reintentar carga",
            onAction: () => reloadCatalogAndReviews()
        });
    }
}

/**
 * Refresca el Panel Admin y las tarjetas del Catálogo según el rol.
 * @param {Object|null} user
 */
function refreshAllCatalogViews(user) {
    const metrics = calculateCatalogMetrics(enrichedProducts, allReviews);

    // 1. Panel Admin (Proceso 1: solo visible si rol === 'admin')
    renderAdminPanel(
        document.getElementById("admin-panel-mount"),
        user,
        metrics,
        reloadCatalogAndReviews
    );

    // 2. Productos Filtrados y Ordenados
    renderFilteredProducts(user);
}

/**
 * Renderiza la barra interactiva de Búsqueda, Filtros Multicriterio y Ordenamiento.
 */
function renderFilterControls(container) {
    if (!container) return;

    const categoriasOptions = CATEGORIAS_VALIDAS.map(
        (c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join("");

    const pielOptions = TIPOS_PIEL_VALIDOS.map(
        (p) =>
            `<option value="${escapeHTML(p)}" ${
                currentFilters.tipoPiel === p ? "selected" : ""
            }>Piel ${escapeHTML(p)}</option>`
    ).join("");

    const lineasOptions = LINEAS_BIOAQUA.map(
        (l) => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`
    ).join("");

    container.innerHTML = `
        <div class="bio-filter-card">
            <div class="bio-filter-card__top">
                <div class="bio-search-box">
                    <label for="filter-search">🔍 Buscar por producto, activo o beneficio</label>
                    <input
                        type="search"
                        id="filter-search"
                        placeholder="Ej. Ácido Hialurónico, Niacinamida, Arroz, SPF 50, Acné..."
                        value="${escapeHTML(currentFilters.search)}"
                    >
                </div>

                <div class="bio-filter-group">
                    <label for="filter-pais">País de disponibilidad</label>
                    <select id="filter-pais">
                        <option value="Todos">🌎 Todos (SV y GT)</option>
                        <option value="SV">🇸🇻 Disponible en El Salvador</option>
                        <option value="GT">🇬🇹 Disponible en Guatemala</option>
                        <option value="Exclusivo-SV">🇸🇻 Exclusivo El Salvador</option>
                        <option value="Exclusivo-GT">🇬🇹 Exclusivo Guatemala</option>
                    </select>
                </div>

                <div class="bio-filter-group">
                    <label for="filter-sort">Ordenar catálogo por</label>
                    <select id="filter-sort">
                        <option value="destacados">⭐ Destacados y Mejor Calificados</option>
                        <option value="precio-asc">💲 Precio: Menor a Mayor</option>
                        <option value="precio-desc">💲 Precio: Mayor a Menor</option>
                        <option value="rating-desc">★ Calificación Promedio (Mayor a Menor)</option>
                        <option value="nombre-asc">🔤 Nombre (A - Z)</option>
                    </select>
                </div>
            </div>

            <div class="bio-filter-card__bottom">
                <div class="bio-filter-group">
                    <label for="filter-categoria">Categoría de Paso</label>
                    <select id="filter-categoria">
                        <option value="Todas">Todas las categorías</option>
                        ${categoriasOptions}
                    </select>
                </div>

                <div class="bio-filter-group">
                    <label for="filter-piel">Tipo de Piel Recomendada</label>
                    <select id="filter-piel">
                        <option value="Todas">Todos los tipos de piel</option>
                        ${pielOptions}
                    </select>
                </div>

                <div class="bio-filter-group">
                    <label for="filter-linea">Línea Bioaqua</label>
                    <select id="filter-linea">
                        <option value="Todas">Todas las líneas</option>
                        ${lineasOptions}
                    </select>
                </div>

                <div class="bio-filter-group">
                    <label for="filter-stock">Estado de Stock</label>
                    <select id="filter-stock">
                        <option value="Todos">Todos los estados</option>
                        <option value="En Stock">En Stock</option>
                        <option value="Stock Bajo">Stock Bajo</option>
                        <option value="Agotado">Agotado</option>
                    </select>
                </div>

                <div class="bio-filter-actions">
                    <button type="button" class="bio-btn bio-btn--outline" id="btn-clear-filters">
                        Limpiar filtros
                    </button>
                </div>
            </div>
        </div>
    `;

    // Listeners en tiempo real (input / change) para cada filtro
    const bindFilter = (id, key, eventName = "change") => {
        const el = container.querySelector(id);
        if (!el) return;
        el.addEventListener(eventName, (e) => {
            currentFilters[key] = e.target.value;
            renderFilteredProducts(getCurrentUser());
        });
    };

    bindFilter("#filter-search", "search", "input");
    bindFilter("#filter-pais", "pais", "change");
    bindFilter("#filter-sort", "sortBy", "change");
    bindFilter("#filter-categoria", "categoria", "change");
    bindFilter("#filter-piel", "tipoPiel", "change");
    bindFilter("#filter-linea", "linea", "change");
    bindFilter("#filter-stock", "stockEstado", "change");

    container.querySelector("#btn-clear-filters")?.addEventListener("click", () => {
        currentFilters.search = "";
        currentFilters.pais = "Todos";
        currentFilters.categoria = "Todas";
        currentFilters.tipoPiel = "Todas";
        currentFilters.linea = "Todas";
        currentFilters.stockEstado = "Todos";
        currentFilters.sortBy = "destacados";

        container.querySelector("#filter-search").value = "";
        container.querySelector("#filter-pais").value = "Todos";
        container.querySelector("#filter-sort").value = "destacados";
        container.querySelector("#filter-categoria").value = "Todas";
        container.querySelector("#filter-piel").value = "Todas";
        container.querySelector("#filter-linea").value = "Todas";
        container.querySelector("#filter-stock").value = "Todos";

        renderFilteredProducts(getCurrentUser());
        showToast("Filtros restablecidos.", "info", 2000);
    });
}

/**
 * Ejecuta el procesamiento de datos (`filterProducts` + `sortProducts`) y actualiza el DOM.
 */
function renderFilteredProducts(user) {
    const bestSellersSection = document.getElementById("best-sellers-section");
    const bestSellersGrid = document.getElementById("best-sellers-dynamic-grid");
    const catalogContainer = document.getElementById("catalog-dynamic-container");

    if (!catalogContainer) return;

    const activeRegion = getActiveRegion();
    const filtered = filterProducts(enrichedProducts, currentFilters);
    const sorted = sortProducts(filtered, currentFilters.sortBy, activeRegion);

    // Determinar si hay algún filtro o criterio de ordenamiento activo
    const hasActiveFilterOrSort =
        Boolean(currentFilters.search.trim()) ||
        currentFilters.pais !== "Todos" ||
        currentFilters.categoria !== "Todas" ||
        currentFilters.tipoPiel !== "Todas" ||
        currentFilters.linea !== "Todas" ||
        currentFilters.stockEstado !== "Todos" ||
        currentFilters.sortBy !== "destacados";

    // Mostrar Best Sellers arriba cuando se explora el catálogo general sin filtros restrictivos
    const featuredList = sorted.filter((p) => p.destacado);

    if (bestSellersSection && bestSellersGrid) {
        if (featuredList.length > 0 && !hasActiveFilterOrSort) {
            bestSellersSection.classList.remove("hidden");
            bestSellersGrid.innerHTML = featuredList
                .slice(0, 3)
                .map((prod) => createBestSellerCardHTML(prod, user, activeRegion))
                .join("");
            bindProductCardEvents(bestSellersGrid, user);
        } else {
            bestSellersSection.classList.add("hidden");
            bestSellersGrid.innerHTML = "";
        }
    }

    // Estado Vacío ("Empty State") si ningún producto coincide con los filtros
    if (sorted.length === 0) {
        renderEmptyState(catalogContainer, {
            icon: "🔍",
            title: "No encontramos productos Bioaqua con esos filtros",
            message:
                "Prueba buscando otro ingrediente activo (ej. Ácido Hialurónico, Arroz, Vitamina C) o restablece los filtros activos.",
            actionText: "Restablecer todos los filtros",
            onAction: () => {
                document.getElementById("btn-clear-filters")?.click();
            }
        });
        return;
    }

    // Si hay búsqueda/filtros/ordenamiento activo, mostrar los resultados directamente en la grilla
    if (hasActiveFilterOrSort) {
        catalogContainer.innerHTML = `
            <div class="bio-category-block">
                <h3>Resultados encontrados (${sorted.length})</h3>
                <div class="products-cards-grid">
                    ${sorted.map((prod) => createStandardProductCardHTML(prod, user, activeRegion)).join("")}
                </div>
            </div>
        `;
    } else {
        // Agrupar dinámicamente por categoría respetando el diseño de secciones de productos.html
        const grouped = new Map();
        for (const prod of sorted) {
            const cat = prod.categoria || "Otros";
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat).push(prod);
        }

        catalogContainer.innerHTML = Array.from(grouped.entries())
            .map(
                ([categoria, items]) => `
                <div class="bio-category-block">
                    <h3>${escapeHTML(categoria)}</h3>
                    <div class="products-cards-grid">
                        ${items.map((prod) => createStandardProductCardHTML(prod, user, activeRegion)).join("")}
                    </div>
                </div>
            `
            )
            .join("");
    }

    bindProductCardEvents(catalogContainer, user);
}

/**
 * Genera los controles de interacción en cada tarjeta según la sesión y el rol:
 * - Visitante sin sesión: solo lectura (sin botones).
 * - Rol 'cliente' (autenticado): botón de Reseñas ("★ Reseñas").
 * - Rol 'admin': botón de Reseñas + botones CRUD ("✎ Editar", "🗑 Eliminar").
 */
function renderCardRoleControlsHTML(prod, user) {
    if (!user) return "";

    const isAdmin = user.rol === "admin";

    return `
        <footer class="bio-card-admin-actions">
            <button
                type="button"
                class="bio-btn bio-btn--xs bio-btn--outline bio-card-btn-reviews"
                data-action="open-reviews"
                data-id="${escapeHTML(prod.id)}"
            >
                ★ Reseñas (${prod.totalResenas || 0})
            </button>
            ${
                isAdmin
                    ? `
                    <button type="button" class="bio-btn bio-btn--xs bio-btn--cyan bio-card-btn-crud" data-action="edit-product" data-id="${escapeHTML(prod.id)}" title="Editar producto">
                        ✎ Editar
                    </button>
                    <button type="button" class="bio-btn bio-btn--xs bio-btn--danger bio-card-btn-crud" data-action="delete-product" data-id="${escapeHTML(prod.id)}" title="Eliminar producto">
                        🗑 Eliminar
                    </button>
                `
                    : ""
            }
        </footer>
    `;
}

/**
 * Genera el HTML de una tarjeta de la sección Best Sellers basado en el nuevo diseño.
 */
function createBestSellerCardHTML(prod, user, activeRegion) {
    const imgSrc = normalizeImageUrl(prod.imagenUrl);
    const priceLabel = formatProductPrice(prod, activeRegion);
    const featureTag = prod.linea || prod.categoria || "Hidratación";

    return `
        <article data-product-id="${escapeHTML(prod.id)}">
            <div>
                <img loading="lazy" src="${escapeHTML(imgSrc)}" alt="${escapeHTML(prod.nombre)}">
            </div>
            <h3>${escapeHTML(prod.nombre)}</h3>
            <p>${escapeHTML(prod.descripcion)}</p>
            <ul>
                <li>Best seller</li>
                <li>${escapeHTML(featureTag)}</li>
                <li>${escapeHTML(priceLabel)}</li>
            </ul>
            ${renderCardRoleControlsHTML(prod, user)}
        </article>
    `;
}

/**
 * Genera el HTML de una tarjeta estándar de producto basado en el nuevo diseño (.product-card).
 */
function createStandardProductCardHTML(prod, user, activeRegion) {
    const imgSrc = normalizeImageUrl(prod.imagenUrl);
    const priceLabel = formatProductPrice(prod, activeRegion);
    const primaryTag = prod.categoria || "Skincare";
    const secondaryTag = prod.linea || (prod.tipoPielRecomendada ? `Piel ${prod.tipoPielRecomendada}` : "Bioaqua");

    return `
        <article class="product-card" data-product-id="${escapeHTML(prod.id)}">
            <div>
                <div>
                    <div>
                        <img loading="lazy" src="${escapeHTML(imgSrc)}" alt="${escapeHTML(prod.nombre)}">
                    </div>
                    <h4>${escapeHTML(prod.nombre)}</h4>
                </div>
                <div>
                    <p>${escapeHTML(prod.descripcion)}</p>
                    <ul>
                        <li>${escapeHTML(primaryTag)}</li>
                        <li>${escapeHTML(secondaryTag)}</li>
                        <li>${escapeHTML(priceLabel)}</li>
                    </ul>
                    ${renderCardRoleControlsHTML(prod, user)}
                </div>
            </div>
        </article>
    `;
}

/**
 * Conecta los eventos de los botones en cada tarjeta ("★ Reseñas" y "✎ Editar" / "🗑 Eliminar" para el rol Administrador).
 */
function bindProductCardEvents(container, user) {
    if (!container) return;

    const findProd = (id) => enrichedProducts.find((p) => p.id === id);

    // 1. Ver / Publicar Reseñas (Cliente / Usuario autenticado)
    container.querySelectorAll('[data-action="open-reviews"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            openProductReviewsModal(prod, allReviews, getCurrentUser(), async () => {
                await reloadCatalogAndReviews();
            });
        });
    });

    // 2. Editar Producto (Exclusivo Admin)
    container.querySelectorAll('[data-action="edit-product"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            openProductModal(prod, reloadCatalogAndReviews);
        });
    });

    // 3. Eliminar Producto (Exclusivo Admin)
    container.querySelectorAll('[data-action="delete-product"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            handleDeleteProduct(prod, reloadCatalogAndReviews);
        });
    });
}
