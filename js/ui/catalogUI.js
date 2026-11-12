/**
 * ============================================================================
 * ARCHIVO: js/ui/catalogUI.js
 * RESPONSABILIDAD: Renderizado 100% dinámico del Catálogo de Productos Bioaqua
 * desde Firestore (Cero catálogo estático), barra de búsqueda y filtrado
 * multicriterio en tiempo real, ordenamiento y bloque de indicadores (KPIs).
 * ============================================================================
 */

import { getAllProducts } from "../services/productService.js";
import { getAllReviews, getUserRoutine } from "../services/routineService.js";
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
import {
    renderClientRoutineSection,
    openAddRoutineModal,
    openProductReviewsModal
} from "./clientRoutineUI.js";
import { getActiveRegion, escapeHTML } from "./navbarUI.js";

// Estado reactivo del catálogo en memoria para filtrado y ordenamiento instantáneo
let rawProducts = [];
let allReviews = [];
let enrichedProducts = [];
let userRoutineProductIds = new Set();

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

    // 2. Preparar contenedores estructurales en `productos.html` (reemplazando cualquier contenido estático)
    mainContainer.innerHTML = `
        <!-- 1. PANEL EXCLUSIVO ROL ADMIN (Proceso 1) -->
        <section id="admin-panel-mount" class="hidden" aria-label="Panel de Administración"></section>

        <!-- 2. BLOQUE DE INDICADORES CALCULADOS CON JS NATIVO (KPIs) -->
        <section id="catalog-kpis-mount" class="bio-kpis-section" aria-label="Indicadores del Catálogo Regional"></section>

        <!-- 3. SECCIÓN MI RUTINA BIOAQUA (Proceso 2 - Rol Cliente) -->
        <section id="client-routine-mount" aria-label="Mi Rutina Personalizada Bioaqua"></section>

        <!-- 4. BARRA DE BÚSQUEDA MULTICRITERIO, FILTROS Y ORDENAMIENTO -->
        <section id="catalog-filters-mount" class="bio-filters-section" aria-label="Filtros y búsqueda del catálogo"></section>

        <!-- 5. SECCIÓN DINÁMICA: BEST SELLERS / DESTACADOS -->
        <section id="best-sellers-section">
            <div class="bio-section-heading">
                <h2>Best sellers Bioaqua</h2>
                <span class="bio-section-badge" id="best-sellers-count-badge">Destacados</span>
            </div>
            <div id="best-sellers-dynamic-grid" class="best-sellers-grid"></div>
        </section>

        <!-- 6. SECCIÓN DINÁMICA: CATÁLOGO GENERAL REGIONAL -->
        <section id="all-products-section">
            <div class="bio-section-heading">
                <h2 id="catalog-main-heading">Catálogo Regional Bioaqua (SV & GT)</h2>
                <span class="bio-section-badge" id="catalog-results-count">Cargando...</span>
            </div>
            <div id="catalog-dynamic-container"></div>
        </section>
    `;

    // Renderizar la barra de controles de filtrado una sola vez
    renderFilterControls(document.getElementById("catalog-filters-mount"));

    // Cargar datos iniciales desde Firestore con estado de carga visual (Skeletons)
    await reloadCatalogAndReviews();

    // Suscribirse a cambios de sesión (Login/Logout/Cambio de Rol) para actualizar vistas sin recargar
    subscribeToAuthChanges(async (userProfile) => {
        await syncUserRoutineSet(userProfile);
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
        renderLoadingState(catalogMount, "Sincronizando catálogo Bioaqua SV & GT desde Firestore...", 6);
        if (bestSellersMount) bestSellersMount.innerHTML = "";

        const [productsData, reviewsData] = await Promise.all([
            getAllProducts(),
            getAllReviews()
        ]);

        rawProducts = productsData;
        allReviews = reviewsData;
        enrichedProducts = enrichProductsWithRatings(rawProducts, allReviews);

        const user = getCurrentUser();
        await syncUserRoutineSet(user);
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

async function syncUserRoutineSet(user) {
    if (!user) {
        userRoutineProductIds = new Set();
        return;
    }
    try {
        const routine = await getUserRoutine(user.uid);
        userRoutineProductIds = new Set((routine.pasos || []).map((p) => p.productoId));
    } catch {
        userRoutineProductIds = new Set();
    }
}

/**
 * Refresca el Panel Admin, Indicadores KPI, Mi Rutina y las tarjetas del Catálogo.
 * @param {Object|null} user
 */
function refreshAllCatalogViews(user) {
    const metrics = calculateCatalogMetrics(enrichedProducts, allReviews);

    // 1. Panel Admin (solo si rol === 'admin')
    renderAdminPanel(
        document.getElementById("admin-panel-mount"),
        user,
        metrics,
        reloadCatalogAndReviews
    );

    // 2. Bloque de Indicadores (KPIs calculados con JS)
    renderCatalogKPIs(document.getElementById("catalog-kpis-mount"), metrics);

    // 3. Sección Mi Rutina Bioaqua (Proceso 2 Cliente)
    renderClientRoutineSection(
        document.getElementById("client-routine-mount"),
        user,
        enrichedProducts,
        async () => {
            await syncUserRoutineSet(user);
            renderFilteredProducts(user);
        }
    );

    // 4. Productos Filtrados y Ordenados
    renderFilteredProducts(user);
}

/**
 * Renderiza el bloque de Indicadores Calculados con JS Nativo.
 */
function renderCatalogKPIs(container, metrics) {
    if (!container) return;
    const region = getActiveRegion();

    container.innerHTML = `
        <div class="bio-kpis-grid">
            <article class="bio-kpi-card">
                <span class="bio-kpi-card__label">Catálogo Activo Regional</span>
                <strong class="bio-kpi-card__value">${metrics.totalProductos} Productos</strong>
                <span class="bio-kpi-card__sub">
                    🇸🇻 ${metrics.disponiblesSV} en El Salvador · 🇬🇹 ${metrics.disponiblesGT} en Guatemala
                </span>
            </article>

            <article class="bio-kpi-card">
                <span class="bio-kpi-card__label">Valoración Promedio Clientes</span>
                <strong class="bio-kpi-card__value">★ ${metrics.calificacionGlobal.toFixed(1)} / 5.0</strong>
                <span class="bio-kpi-card__sub">
                    Basado en ${metrics.totalResenas} reseñas verificadas SV & GT
                </span>
            </article>

            <article class="bio-kpi-card">
                <span class="bio-kpi-card__label">Precio Promedio de Referencia</span>
                <strong class="bio-kpi-card__value">
                    ${
                        region === "GT"
                            ? `Q${metrics.precioPromedioGTQ.toFixed(2)} GTQ`
                            : `$${metrics.precioPromedioUSD.toFixed(2)} USD`
                    }
                </strong>
                <span class="bio-kpi-card__sub">
                    🇸🇻 Prom. $${metrics.precioPromedioUSD.toFixed(2)} · 🇬🇹 Prom. Q${metrics.precioPromedioGTQ.toFixed(2)}
                </span>
            </article>

            <article class="bio-kpi-card">
                <span class="bio-kpi-card__label">Disponibilidad de Inventario</span>
                <strong class="bio-kpi-card__value">${metrics.enStock} En Stock</strong>
                <span class="bio-kpi-card__sub">
                    ${metrics.stockBajo} stock bajo · ${metrics.agotados} agotados
                </span>
            </article>
        </div>
    `;
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

    // Listeners en tiempo real para cada filtro
    const bindFilter = (id, key, eventName = "change") => {
        const el = container.querySelector(id);
        if (!el) return;
        el.addEventListener(eventName, (e) => {
            currentFilters[key] = e.target.value;
            renderFilteredProducts(getCurrentUser());
        });
    };

    bindFilter("#filter-search", "search", "input");
    bindFilter("#filter-pais", "pais");
    bindFilter("#filter-sort", "sortBy");
    bindFilter("#filter-categoria", "categoria");
    bindFilter("#filter-piel", "tipoPiel");
    bindFilter("#filter-linea", "linea");
    bindFilter("#filter-stock", "stockEstado");

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
    const bestSellersBadge = document.getElementById("best-sellers-count-badge");
    const catalogContainer = document.getElementById("catalog-dynamic-container");
    const resultsCountBadge = document.getElementById("catalog-results-count");

    if (!catalogContainer) return;

    const activeRegion = getActiveRegion();
    const filtered = filterProducts(enrichedProducts, currentFilters);
    const sorted = sortProducts(filtered, currentFilters.sortBy, activeRegion);

    if (resultsCountBadge) {
        resultsCountBadge.textContent = `${sorted.length} de ${enrichedProducts.length} productos`;
    }

    // Mostrar Best Sellers arriba cuando no hay filtros restrictivos de texto/categoría o si hay destacados en el resultado
    const featuredList = sorted.filter((p) => p.destacado);
    const hasActiveSearch =
        Boolean(currentFilters.search.trim()) ||
        currentFilters.categoria !== "Todas" ||
        currentFilters.linea !== "Todas";

    if (bestSellersSection && bestSellersGrid) {
        if (featuredList.length > 0 && !hasActiveSearch) {
            bestSellersSection.classList.remove("hidden");
            if (bestSellersBadge) {
                bestSellersBadge.textContent = `${featuredList.length} favoritos en Centroamérica`;
            }
            bestSellersGrid.innerHTML = featuredList
                .slice(0, 4)
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

    // Agrupar por categoría cuando se visualiza por defecto, o mostrar en grilla directa al ordenar por precio/rating
    const isCustomSort = currentFilters.sortBy !== "destacados" || hasActiveSearch;

    if (isCustomSort) {
        catalogContainer.innerHTML = `
            <div class="products-cards-grid">
                ${sorted.map((prod) => createStandardProductCardHTML(prod, user, activeRegion)).join("")}
            </div>
        `;
    } else {
        // Agrupar dinámicamente por categoría manteniendo la elegancia original de productos.html
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
                    <h3 class="bio-category-subtitle">${escapeHTML(categoria)} <span>(${items.length})</span></h3>
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
 * Genera el HTML de una tarjeta de la sección Best Sellers respetando `.best-sellers-grid > article` de `productosStyle.css`.
 */
function createBestSellerCardHTML(prod, user, activeRegion) {
    const isAdmin = user && user.rol === "admin";
    const inRoutine = userRoutineProductIds.has(prod.id);
    const countryBadge = getCountryBadgeText(prod.disponibilidadPais);
    const stockClass = getStockClass(prod.stockEstado);
    const ratingText = prod.totalResenas > 0 ? `★ ${prod.ratingPromedio.toFixed(1)} (${prod.totalResenas})` : "★ Nuevo";

    return `
        <article class="bio-dynamic-bestseller" data-product-id="${escapeHTML(prod.id)}">
            <div class="bio-card-img-wrap">
                <span class="bio-card-country-chip">${countryBadge}</span>
                <span class="bio-card-stock-chip ${stockClass}">${escapeHTML(prod.stockEstado)}</span>
                <img loading="lazy" src="${escapeHTML(prod.imagenUrl)}" alt="${escapeHTML(prod.nombre)}">
            </div>
            <h3>${escapeHTML(prod.nombre)}</h3>
            <div class="bio-card-price-row">
                <span class="bio-price-tag ${activeRegion === "SV" ? "active-currency" : ""}">
                    🇸🇻 $${Number(prod.precioReferenciaUSD).toFixed(2)}
                </span>
                <span class="bio-price-tag ${activeRegion === "GT" ? "active-currency" : ""}">
                    🇬🇹 Q${Number(prod.precioReferenciaGTQ).toFixed(2)}
                </span>
                <span class="bio-rating-pill">${ratingText}</span>
            </div>
            <p>${escapeHTML(prod.descripcion)}</p>
            <p class="bio-card-ingredients"><strong>Activos:</strong> ${escapeHTML(prod.ingredientesClave)}</p>
            <ul>
                <li>Best seller</li>
                <li>${escapeHTML(prod.linea)}</li>
                <li>Piel ${escapeHTML(prod.tipoPielRecomendada)}</li>
            </ul>
            <div class="bio-card-actions">
                <button type="button" class="bio-btn bio-btn--xs ${
                    inRoutine ? "bio-btn--success" : "bio-btn--primary"
                }" data-action="add-routine" data-id="${escapeHTML(prod.id)}" ${
                    prod.stockEstado === "Agotado" ? "disabled" : ""
                }>
                    ${inRoutine ? "✓ En Mi Rutina" : "+ Mi Rutina"}
                </button>
                <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" data-action="open-reviews" data-id="${escapeHTML(prod.id)}">
                    ★ Reseñas (${prod.totalResenas || 0})
                </button>
                ${
                    isAdmin
                        ? `
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--cyan" data-action="edit-product" data-id="${escapeHTML(prod.id)}" title="Editar producto">✎</button>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--danger" data-action="delete-product" data-id="${escapeHTML(prod.id)}" title="Eliminar producto">🗑</button>
                    `
                        : ""
                }
            </div>
        </article>
    `;
}

/**
 * Genera el HTML de una tarjeta estándar respetando `.product-card` de `productosStyle.css`.
 */
function createStandardProductCardHTML(prod, user, activeRegion) {
    const isAdmin = user && user.rol === "admin";
    const inRoutine = userRoutineProductIds.has(prod.id);
    const countryBadge = getCountryBadgeText(prod.disponibilidadPais);
    const stockClass = getStockClass(prod.stockEstado);
    const ratingText = prod.totalResenas > 0 ? `★ ${prod.ratingPromedio.toFixed(1)} (${prod.totalResenas})` : "★ Nuevo";

    return `
        <article class="product-card" data-product-id="${escapeHTML(prod.id)}">
            <div>
                <div>
                    <div class="bio-card-img-wrap">
                        <span class="bio-card-country-chip">${countryBadge}</span>
                        <span class="bio-card-stock-chip ${stockClass}">${escapeHTML(prod.stockEstado)}</span>
                        <img loading="lazy" src="${escapeHTML(prod.imagenUrl)}" alt="${escapeHTML(prod.nombre)}">
                    </div>
                    <h4>${escapeHTML(prod.nombre)}</h4>
                </div>
                <div>
                    <div class="bio-card-price-row">
                        <span class="bio-price-tag ${activeRegion === "SV" ? "active-currency" : ""}">
                            🇸🇻 $${Number(prod.precioReferenciaUSD).toFixed(2)}
                        </span>
                        <span class="bio-price-tag ${activeRegion === "GT" ? "active-currency" : ""}">
                            🇬🇹 Q${Number(prod.precioReferenciaGTQ).toFixed(2)}
                        </span>
                        <span class="bio-rating-pill">${ratingText}</span>
                    </div>
                    <p>${escapeHTML(prod.descripcion)}</p>
                    <p class="bio-card-ingredients"><strong>Ingredientes clave:</strong> ${escapeHTML(prod.ingredientesClave)}</p>
                    <ul>
                        <li>${escapeHTML(prod.categoria)}</li>
                        <li>${escapeHTML(prod.linea)}</li>
                        <li>Piel ${escapeHTML(prod.tipoPielRecomendada)}</li>
                    </ul>
                    <div class="bio-card-actions">
                        <button type="button" class="bio-btn bio-btn--xs ${
                            inRoutine ? "bio-btn--success" : "bio-btn--primary"
                        }" data-action="add-routine" data-id="${escapeHTML(prod.id)}" ${
                            prod.stockEstado === "Agotado" ? "disabled" : ""
                        }>
                            ${inRoutine ? "✓ En Mi Rutina" : "+ Mi Rutina"}
                        </button>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" data-action="open-reviews" data-id="${escapeHTML(prod.id)}">
                            ★ Reseñas (${prod.totalResenas || 0})
                        </button>
                        ${
                            isAdmin
                                ? `
                                <button type="button" class="bio-btn bio-btn--xs bio-btn--cyan" data-action="edit-product" data-id="${escapeHTML(prod.id)}" title="Editar producto">✎</button>
                                <button type="button" class="bio-btn bio-btn--xs bio-btn--danger" data-action="delete-product" data-id="${escapeHTML(prod.id)}" title="Eliminar producto">🗑</button>
                            `
                                : ""
                        }
                    </div>
                </div>
            </div>
        </article>
    `;
}

/**
 * Conecta los eventos de botones ("+ Mi Rutina", "★ Reseñas", "✎ Editar", "🗑 Eliminar") en las tarjetas renderizadas.
 */
function bindProductCardEvents(container, user) {
    if (!container) return;

    const findProd = (id) => enrichedProducts.find((p) => p.id === id);

    // 1. Agregar a Mi Rutina (Proceso 2)
    container.querySelectorAll('[data-action="add-routine"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            openAddRoutineModal(prod, user, null, async () => {
                await syncUserRoutineSet(getCurrentUser());
                refreshAllCatalogViews(getCurrentUser());
            });
        });
    });

    // 2. Ver / Publicar Reseñas (Proceso 2)
    container.querySelectorAll('[data-action="open-reviews"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            openProductReviewsModal(prod, allReviews, getCurrentUser(), async () => {
                await reloadCatalogAndReviews();
            });
        });
    });

    // 3. Editar Producto (Proceso 1 - Admin)
    container.querySelectorAll('[data-action="edit-product"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            openProductModal(prod, reloadCatalogAndReviews);
        });
    });

    // 4. Eliminar Producto (Proceso 1 - Admin)
    container.querySelectorAll('[data-action="delete-product"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = findProd(btn.dataset.id);
            if (!prod) return;
            handleDeleteProduct(prod, reloadCatalogAndReviews);
        });
    });
}

function getCountryBadgeText(disp) {
    if (disp === "SV") return "🇸🇻 Solo SV";
    if (disp === "GT") return "🇬🇹 Solo GT";
    return "🇸🇻 🇬🇹 SV & GT";
}

function getStockClass(stock) {
    if (stock === "Agotado") return "stock-out";
    if (stock === "Stock Bajo") return "stock-low";
    return "stock-ok";
}

