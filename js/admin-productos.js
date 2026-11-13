/**
 * ============================================================================
 * ARCHIVO: js/admin-productos.js
 * RESPONSABILIDAD: Lógica de negocio exclusiva para la vista de Administración
 * (`productos-admin.html`).
 * Incluye:
 * 1. Protección de ruta por rol (`rol === "admin"`, redirige a `index.html` si no).
 * 2. Operaciones CRUD completas con Cloud Firestore (`loadProducts`,
 *    `saveProduct`, `updateProduct`, `deleteProduct`) usando `async/await` y `try/catch`.
 * 3. Validaciones de formulario, estados de carga ("Guardando...") y notificaciones Toast.
 * ============================================================================
 */

import { subscribeToAuthChanges } from "./services/authService.js";
import {
    getAllProducts,
    createProduct as createProductInFirestore,
    updateProduct as updateProductInFirestore,
    deleteProduct as deleteProductFromFirestore,
    seedProductsToFirestore
} from "./services/productService.js";
import { AVAILABLE_LOCAL_IMAGES } from "./services/seed.js";
import {
    CATEGORIAS_VALIDAS,
    TIPOS_PIEL_VALIDOS,
    LINEAS_BIOAQUA
} from "./utils/validators.js";
import {
    initNavbarUI,
    renderFormErrors,
    escapeHTML,
    getActiveRegion
} from "./ui/navbarUI.js";
import {
    showToast,
    renderLoadingState,
    renderEmptyState,
    confirmDialog
} from "./ui/notificationsUI.js";

// Estado local del inventario en memoria
let inventoryProducts = [];
let currentEditingId = null;
let searchQuery = "";
let isAdminInitialized = false;

/**
 * Normaliza la ruta de imagen local para evitar errores con nombres de archivo.
 */
function normalizeImageUrl(url) {
    if (!url) return "img/suero-acido-hialuronico-clean.png";
    if (url === "img/proteina-de-seda-clean.png") {
        return "img/proteina-de-seda-clean (1).png";
    }
    return url;
}

/**
 * 1. PROTECCIÓN DE RUTA (SEGURIDAD) E INICIALIZACIÓN
 * Verifica al cargar la página si el usuario activo tiene `rol: "admin"`.
 * Si no hay sesión o el rol es `"cliente"`, redirige inmediatamente a `index.html`.
 */
document.addEventListener("DOMContentLoaded", () => {
    initNavbarUI();

    subscribeToAuthChanges(async (userProfile) => {
        if (!userProfile || userProfile.rol !== "admin") {
            window.location.replace("index.html");
            return;
        }

        if (!isAdminInitialized) {
            isAdminInitialized = true;
            initAdminFormControls();
            await loadProducts();
        }
    });

    window.addEventListener("bioaqua:regionChanged", () => {
        renderInventoryList();
    });
});

/**
 * Inicializa las listas desplegables (`<select>`) y los eventos del formulario y buscador.
 */
function initAdminFormControls() {
    const categoriaSelect = document.getElementById("prod-categoria");
    const pielSelect = document.getElementById("prod-tipo-piel");
    const lineaSelect = document.getElementById("prod-linea");
    const presetImgSelect = document.getElementById("prod-preset-img");
    const imgUrlInput = document.getElementById("prod-imagen-url");
    const imgPreview = document.getElementById("prod-img-preview");
    const usdInput = document.getElementById("prod-precio-usd");
    const gtqInput = document.getElementById("prod-precio-gtq");
    const form = document.getElementById("admin-product-form");
    const cancelBtn = document.getElementById("btn-cancel-edit");
    const searchInput = document.getElementById("admin-inventory-search");
    const seedBtn = document.getElementById("btn-admin-seed-catalog");

    if (categoriaSelect) {
        categoriaSelect.innerHTML = CATEGORIAS_VALIDAS.map(
            (cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`
        ).join("");
    }

    if (pielSelect) {
        pielSelect.innerHTML = TIPOS_PIEL_VALIDOS.map(
            (piel) => `<option value="${escapeHTML(piel)}">Piel ${escapeHTML(piel)}</option>`
        ).join("");
    }

    if (lineaSelect) {
        lineaSelect.innerHTML = LINEAS_BIOAQUA.map(
            (lin) => `<option value="${escapeHTML(lin)}">${escapeHTML(lin)}</option>`
        ).join("");
    }

    if (presetImgSelect) {
        presetImgSelect.innerHTML =
            `<option value="">-- Seleccionar imagen local de Bioaqua --</option>` +
            AVAILABLE_LOCAL_IMAGES.map(
                (img) => `<option value="${escapeHTML(img.path)}">${escapeHTML(img.label)}</option>`
            ).join("");

        presetImgSelect.addEventListener("change", () => {
            if (presetImgSelect.value && imgUrlInput && imgPreview) {
                imgUrlInput.value = presetImgSelect.value;
                imgPreview.src = presetImgSelect.value;
            }
        });
    }

    imgUrlInput?.addEventListener("input", () => {
        const val = imgUrlInput.value.trim();
        if (val && imgPreview) {
            imgPreview.src = val;
        }
    });

    // Sugerir conversión a Quetzales automáticamente si no se ha editado manualmente
    usdInput?.addEventListener("input", () => {
        const usd = parseFloat(usdInput.value);
        if (!Number.isNaN(usd) && usd > 0 && gtqInput && !gtqInput.dataset.manual) {
            gtqInput.value = (usd * 7.8).toFixed(2);
        }
    });

    gtqInput?.addEventListener("input", () => {
        gtqInput.dataset.manual = "true";
    });

    // Evento principal: Crear o Actualizar producto al enviar el formulario
    form?.addEventListener("submit", handleFormSubmit);

    // Cancelar modo edición y volver a modo creación
    cancelBtn?.addEventListener("click", () => {
        resetFormToCreateMode();
        showToast("Modo edición cancelado.", "info", 2000);
    });

    // Filtro rápido del inventario en tiempo real
    searchInput?.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderInventoryList();
    });

    // Botón para restaurar el catálogo oficial (Seed)
    seedBtn?.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
            title: "Restaurar Catálogo Oficial (Seed)",
            message:
                "¿Deseas restaurar los 13 productos oficiales de Bioaqua en Firestore? Los productos agregados manualmente se mantendrán.",
            confirmText: "Sí, restaurar Seed",
            cancelText: "Cancelar"
        });
        if (!confirmed) return;

        try {
            seedBtn.disabled = true;
            seedBtn.textContent = "Cargando Seed...";
            await seedProductsToFirestore();
            showToast("Catálogo inicial restaurado con éxito en Firestore.", "success");
            await loadProducts();
        } catch (error) {
            showToast(error.message || "Error al restaurar el catálogo.", "error");
        } finally {
            seedBtn.disabled = false;
            seedBtn.textContent = "⚡ Restaurar Catálogo Inicial (Seed)";
        }
    });
}

/**
 * 2A. OPERACIÓN READ: `loadProducts()`
 * Obtiene todos los productos desde Firestore y los renderiza dinámicamente en el DOM.
 */
export async function loadProducts() {
    const listContainer = document.getElementById("admin-products-list");
    if (!listContainer) return;

    try {
        renderLoadingState(listContainer, "Cargando inventario de productos desde Firestore...", 4);
        inventoryProducts = await getAllProducts();
        renderInventoryList();
    } catch (error) {
        console.error("Error en loadProducts:", error);
        showToast(error.message || "Error al cargar los productos desde Firestore.", "error");
        renderEmptyState(listContainer, {
            icon: "⚠️",
            title: "Error al cargar el inventario",
            message: error.message || "Verifica tu conexión con Firebase Cloud Firestore.",
            actionText: "Reintentar",
            onAction: () => loadProducts()
        });
    }
}

/**
 * Renderiza las tarjetas del inventario en el DOM aplicando el filtro de búsqueda rápida.
 */
function renderInventoryList() {
    const listContainer = document.getElementById("admin-products-list");
    const countBadge = document.getElementById("admin-inventory-count");
    if (!listContainer) return;

    const activeRegion = getActiveRegion();

    const filtered = inventoryProducts.filter((prod) => {
        if (!searchQuery) return true;
        const haystack = [
            prod.nombre,
            prod.categoria,
            prod.linea,
            prod.tipoPielRecomendada,
            prod.ingredientesClave
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return haystack.includes(searchQuery);
    });

    if (countBadge) {
        countBadge.textContent = `${filtered.length} de ${inventoryProducts.length} productos`;
    }

    if (filtered.length === 0) {
        renderEmptyState(listContainer, {
            icon: "📦",
            title: "No se encontraron productos en el inventario",
            message: searchQuery
                ? "Ningún producto coincide con tu búsqueda. Prueba con otro término."
                : "Aún no hay productos registrados. Usa el formulario lateral para crear el primero."
        });
        return;
    }

    listContainer.innerHTML = filtered
        .map((prod) => {
            const imgSrc = normalizeImageUrl(prod.imagenUrl);
            const usd = Number(prod.precioReferenciaUSD ?? prod.precio ?? 0);
            const gtq = Number(prod.precioReferenciaGTQ ?? usd * 7.8);
            const priceLabel = activeRegion === "GT" ? `Q${gtq.toFixed(2)}` : `$${usd.toFixed(2)}`;
            const isEditing = currentEditingId === prod.id;

            return `
                <article class="product-card ${isEditing ? "product-card--editing" : ""}" data-product-id="${escapeHTML(prod.id)}">
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
                                <li>${escapeHTML(prod.categoria || "Skincare")}</li>
                                <li>Piel ${escapeHTML(prod.tipoPielRecomendada || "Todas")}</li>
                                <li>${escapeHTML(priceLabel)}</li>
                            </ul>
                            <footer class="bio-card-admin-actions">
                                <button
                                    type="button"
                                    class="bio-btn bio-btn--xs bio-btn--cyan"
                                    data-action="edit"
                                    data-id="${escapeHTML(prod.id)}"
                                >
                                    ✎ Editar
                                </button>
                                <button
                                    type="button"
                                    class="bio-btn bio-btn--xs bio-btn--danger"
                                    data-action="delete"
                                    data-id="${escapeHTML(prod.id)}"
                                >
                                    🗑 Eliminar
                                </button>
                            </footer>
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");

    // Conectar eventos de botones "Editar" y "Eliminar" en cada tarjeta
    listContainer.querySelectorAll('[data-action="edit"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = inventoryProducts.find((item) => item.id === btn.dataset.id);
            if (prod) startEditingProduct(prod);
        });
    });

    listContainer.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const prod = inventoryProducts.find((item) => item.id === btn.dataset.id);
            if (prod) deleteProduct(prod);
        });
    });
}

/**
 * Valida los datos del formulario de producto antes de enviarlos a Firestore.
 */
function validateAdminForm(raw) {
    const errors = [];
    const nombre = (raw.nombre || "").trim();
    const categoria = (raw.categoria || "").trim();
    const tipoPielRecomendada = (raw.tipoPielRecomendada || "").trim();
    const linea = (raw.linea || "").trim() || categoria || "Bioaqua";
    const stockEstado = (raw.stockEstado || "En Stock").trim();
    const precioUSD = Number(raw.precioReferenciaUSD);
    const precioGTQ = raw.precioReferenciaGTQ ? Number(raw.precioReferenciaGTQ) : Number((precioUSD * 7.8).toFixed(2));
    const imagenUrl = (raw.imagenUrl || "").trim();
    const descripcion = (raw.descripcion || "").trim();
    const ingredientesClave = (raw.ingredientesClave || "").trim() || linea;
    const destacado = Boolean(raw.destacado);

    if (!nombre || nombre.length < 3) {
        errors.push("El nombre del producto es obligatorio (mínimo 3 caracteres).");
    }
    if (!categoria) {
        errors.push("Debes seleccionar una categoría válida.");
    }
    if (!tipoPielRecomendada) {
        errors.push("Debes seleccionar el tipo de piel recomendada.");
    }
    if (Number.isNaN(precioUSD) || precioUSD <= 0) {
        errors.push("El precio debe ser un valor numérico mayor a 0.");
    }
    if (!imagenUrl) {
        errors.push("La URL o ruta de la imagen es obligatoria.");
    }
    if (!descripcion || descripcion.length < 10) {
        errors.push("La descripción es obligatoria y debe tener al menos 10 caracteres.");
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            nombre,
            categoria,
            tipoPielRecomendada,
            linea,
            stockEstado,
            disponibilidadPais: "Ambos",
            precioReferenciaUSD: Number(precioUSD.toFixed(2)),
            precioReferenciaGTQ: Number((precioGTQ > 0 ? precioGTQ : precioUSD * 7.8).toFixed(2)),
            imagenUrl,
            descripcion,
            ingredientesClave,
            destacado
        }
    };
}

/**
 * Maneja el evento submit del formulario y decide si ejecutar `saveProduct()` o `updateProduct()`.
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const errorBox = document.getElementById("admin-form-errors");
    const submitBtn = document.getElementById("btn-submit-product");

    const rawData = {
        nombre: form.nombre.value,
        categoria: form.categoria.value,
        tipoPielRecomendada: form.tipoPielRecomendada.value,
        linea: form.linea.value,
        stockEstado: form.stockEstado.value,
        precioReferenciaUSD: form.precioReferenciaUSD.value,
        precioReferenciaGTQ: form.precioReferenciaGTQ.value,
        imagenUrl: form.imagenUrl.value,
        ingredientesClave: form.ingredientesClave.value,
        descripcion: form.descripcion.value,
        destacado: form.destacado.checked
    };

    const validation = validateAdminForm(rawData);
    if (!validation.isValid) {
        renderFormErrors(errorBox, validation.errors);
        showToast("Por favor corrige los campos marcados en el formulario.", "warning");
        return;
    }

    renderFormErrors(errorBox, []);

    try {
        // Feedback visual (UX): deshabilitar botón y mostrar "Guardando..."
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Guardando...";
        }

        if (currentEditingId) {
            await updateProduct(currentEditingId, validation.sanitized);
        } else {
            await saveProduct(validation.sanitized);
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = currentEditingId ? "Actualizar Producto" : "Guardar Producto";
        }
    }
}

/**
 * 2B. OPERACIÓN CREATE: `saveProduct()`
 * Agrega un nuevo documento a la colección `productos` en Firestore.
 */
export async function saveProduct(productData) {
    try {
        const created = await createProductInFirestore(productData);
        showToast(`Producto "${created.nombre}" creado con éxito en Firestore.`, "success");
        resetFormToCreateMode();
        await loadProducts();
    } catch (error) {
        console.error("Error en saveProduct:", error);
        showToast(error.message || "No se pudo guardar el producto.", "error");
    }
}

/**
 * 2C. OPERACIÓN UPDATE: `updateProduct()`
 * Modifica un documento existente en la colección `productos` de Firestore.
 */
export async function updateProduct(productId, productData) {
    try {
        await updateProductInFirestore(productId, productData);
        showToast(`Producto "${productData.nombre}" actualizado correctamente.`, "success");
        resetFormToCreateMode();
        await loadProducts();
    } catch (error) {
        console.error("Error en updateProduct:", error);
        showToast(error.message || "No se pudo actualizar el producto.", "error");
    }
}

/**
 * 2D. OPERACIÓN DELETE: `deleteProduct()`
 * Solicita confirmación en pantalla y elimina el documento de Firestore.
 */
export async function deleteProduct(product) {
    const confirmed = await confirmDialog({
        title: "Eliminar Producto de Firestore",
        message: `¿Estás seguro de que deseas eliminar permanentemente "${product.nombre}"? Esta acción no se puede deshacer.`,
        confirmText: "Sí, eliminar",
        cancelText: "Cancelar",
        danger: true
    });

    if (!confirmed) return;

    try {
        await deleteProductFromFirestore(product.id);
        if (currentEditingId === product.id) {
            resetFormToCreateMode();
        }
        showToast(`Producto "${product.nombre}" eliminado del inventario.`, "success");
        await loadProducts();
    } catch (error) {
        console.error("Error en deleteProduct:", error);
        showToast(error.message || "No se pudo eliminar el producto.", "error");
    }
}

/**
 * Rellena el formulario con los datos del producto seleccionado y cambia el botón a "Actualizar Producto".
 */
function startEditingProduct(product) {
    const form = document.getElementById("admin-product-form");
    const modeBadge = document.getElementById("admin-form-mode-badge");
    const formTitle = document.getElementById("admin-form-title");
    const submitBtn = document.getElementById("btn-submit-product");
    const cancelBtn = document.getElementById("btn-cancel-edit");
    const imgPreview = document.getElementById("prod-img-preview");
    const errorBox = document.getElementById("admin-form-errors");

    if (!form) return;

    currentEditingId = product.id;
    renderFormErrors(errorBox, []);

    form.productId.value = product.id;
    form.nombre.value = product.nombre || "";
    form.categoria.value = CATEGORIAS_VALIDAS.includes(product.categoria)
        ? product.categoria
        : CATEGORIAS_VALIDAS[0];
    form.tipoPielRecomendada.value = TIPOS_PIEL_VALIDOS.includes(product.tipoPielRecomendada)
        ? product.tipoPielRecomendada
        : TIPOS_PIEL_VALIDOS[0];
    form.linea.value = LINEAS_BIOAQUA.includes(product.linea) ? product.linea : LINEAS_BIOAQUA[0];
    form.stockEstado.value = product.stockEstado || "En Stock";

    const usd = Number(product.precioReferenciaUSD ?? product.precio ?? 8.5);
    const gtq = Number(product.precioReferenciaGTQ ?? usd * 7.8);
    form.precioReferenciaUSD.value = usd.toFixed(2);
    form.precioReferenciaGTQ.value = gtq.toFixed(2);
    form.precioReferenciaGTQ.dataset.manual = "true";

    const normalizedImg = normalizeImageUrl(product.imagenUrl);
    form.imagenUrl.value = normalizedImg;
    if (imgPreview) imgPreview.src = normalizedImg;

    form.ingredientesClave.value = product.ingredientesClave || "";
    form.descripcion.value = product.descripcion || "";
    form.destacado.checked = Boolean(product.destacado);

    if (modeBadge) modeBadge.textContent = "MODO: EDICIÓN ACTIVA";
    if (formTitle) formTitle.textContent = `Editando: ${product.nombre}`;
    if (submitBtn) submitBtn.textContent = "Actualizar Producto";
    cancelBtn?.classList.remove("hidden");

    renderInventoryList();

    document.getElementById("admin-form-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/**
 * Restablece el formulario a su estado inicial de creación ("Guardar Producto").
 */
function resetFormToCreateMode() {
    const form = document.getElementById("admin-product-form");
    const modeBadge = document.getElementById("admin-form-mode-badge");
    const formTitle = document.getElementById("admin-form-title");
    const submitBtn = document.getElementById("btn-submit-product");
    const cancelBtn = document.getElementById("btn-cancel-edit");
    const imgPreview = document.getElementById("prod-img-preview");
    const errorBox = document.getElementById("admin-form-errors");

    currentEditingId = null;
    renderFormErrors(errorBox, []);

    if (form) {
        form.reset();
        form.productId.value = "";
        delete form.precioReferenciaGTQ.dataset.manual;
    }

    if (imgPreview) {
        imgPreview.src = "img/suero-acido-hialuronico-clean.png";
    }
    if (modeBadge) modeBadge.textContent = "MODO: CREACIÓN";
    if (formTitle) formTitle.textContent = "Nuevo Producto Bioaqua";
    if (submitBtn) submitBtn.textContent = "Guardar Producto";
    cancelBtn?.classList.add("hidden");

    renderInventoryList();
}

