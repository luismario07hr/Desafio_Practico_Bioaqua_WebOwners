/**
 * ============================================================================
 * ARCHIVO: js/ui/adminUI.js
 * RESPONSABILIDAD: Proceso 1 - Administración de Catálogo Regional Bioaqua
 * (Exclusivo para usuarios con `rol === 'admin'`).
 * Permite crear, editar y eliminar productos en Firestore, controlar su
 * disponibilidad por país (SV, GT, Ambos), estado de stock y ejecutar Seed.
 * ============================================================================
 */

import {
    createProduct,
    updateProduct,
    deleteProduct,
    seedProductsToFirestore
} from "../services/productService.js";
import { seedReviewsAndRoutines } from "../services/routineService.js";
import { AVAILABLE_LOCAL_IMAGES } from "../services/seed.js";
import {
    validateProductForm,
    CATEGORIAS_VALIDAS,
    TIPOS_PIEL_VALIDOS,
    LINEAS_BIOAQUA,
    DISPONIBILIDAD_PAISES,
    ESTADOS_STOCK
} from "../utils/validators.js";
import { showToast, confirmDialog } from "./notificationsUI.js";
import { renderFormErrors, escapeHTML } from "./navbarUI.js";

/**
 * Renderiza la barra de herramientas del Administrador encima del catálogo si el usuario es 'admin'.
 * @param {HTMLElement} container Contenedor del panel admin.
 * @param {Object|null} user Perfil del usuario actual.
 * @param {Object} metrics Indicadores calculados del catálogo.
 * @param {Function} onCatalogChanged Callback para recargar el catálogo tras un cambio CRUD.
 */
export function renderAdminPanel(container, user, metrics, onCatalogChanged) {
    if (!container) return;

    // Renderizado condicional estricto: solo visible si rol === 'admin'
    if (!user || user.rol !== "admin") {
        container.innerHTML = "";
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");

    container.innerHTML = `
        <div class="bio-admin-banner" id="panel-admin">
            <div class="bio-admin-banner__info">
                <span class="bio-admin-eyebrow">⚙ PROCESO 1 · PANEL DE ADMINISTRACIÓN REGIONAL (ROL: ADMIN)</span>
                <h3>Gestión de Catálogo Bioaqua El Salvador & Guatemala</h3>
                <p>
                    Controla la disponibilidad regional (🇸🇻 SV / 🇬🇹 GT), precios en USD y Quetzales, estados de stock
                    (<strong>${metrics.enStock} en stock</strong> · <strong>${metrics.stockBajo} stock bajo</strong> · <strong>${metrics.agotados} agotados</strong>)
                    y productos Best Sellers.
                </p>
            </div>
            <div class="bio-admin-banner__actions">
                <button type="button" class="bio-btn bio-btn--cyan" id="btn-admin-new-product">
                    + Nuevo Producto Bioaqua
                </button>
                <button type="button" class="bio-btn bio-btn--outline-light" id="btn-admin-seed">
                    ⚡ Restaurar Catálogo Inicial (Seed)
                </button>
            </div>
        </div>
    `;

    ensureProductCrudModalInDOM(onCatalogChanged);

    container.querySelector("#btn-admin-new-product")?.addEventListener("click", () => {
        openProductModal(null, onCatalogChanged);
    });

    container.querySelector("#btn-admin-seed")?.addEventListener("click", async () => {
        const confirmed = await confirmDialog({
            title: "Restaurar Catálogo Oficial (Seed)",
            message:
                "Se cargarán/actualizarán los 13 productos oficiales de Bioaqua SV/GT junto con reseñas y rutinas de prueba. ¿Deseas continuar?",
            confirmText: "Sí, cargar datos iniciales",
            cancelText: "Cancelar"
        });
        if (!confirmed) return;

        const seedBtn = container.querySelector("#btn-admin-seed");
        try {
            if (seedBtn) {
                seedBtn.disabled = true;
                seedBtn.textContent = "Cargando Seed...";
            }
            await seedProductsToFirestore();
            await seedReviewsAndRoutines();
            showToast("Catálogo Bioaqua SV/GT y reseñas iniciales restaurados con éxito.", "success");
            if (typeof onCatalogChanged === "function") await onCatalogChanged();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            if (seedBtn) {
                seedBtn.disabled = false;
                seedBtn.textContent = "⚡ Restaurar Catálogo Inicial (Seed)";
            }
        }
    });
}

/**
 * Abre el modal CRUD para crear (`product = null`) o editar (`product = {...}`) un producto.
 * @param {Object|null} product Producto a editar o null para crear uno nuevo.
 * @param {Function} onCatalogChanged Callback al guardar.
 */
export function openProductModal(product = null, onCatalogChanged = null) {
    ensureProductCrudModalInDOM(onCatalogChanged);
    const modal = document.getElementById("bio-product-crud-modal");
    const form = document.getElementById("bio-form-product-crud");
    const title = document.getElementById("bio-crud-modal-title");
    const errorBox = document.getElementById("bio-crud-errors");
    const previewImg = document.getElementById("bio-crud-img-preview");

    if (!modal || !form) return;
    if (errorBox) errorBox.innerHTML = "";

    const isEdit = Boolean(product && product.id);
    form.dataset.editId = isEdit ? product.id : "";
    title.textContent = isEdit
        ? `Editar Producto: ${product.nombre}`
        : "Registrar Nuevo Producto Bioaqua";

    form.nombre.value = isEdit ? product.nombre || "" : "";
    form.linea.value = isEdit ? product.linea || LINEAS_BIOAQUA[0] : LINEAS_BIOAQUA[0];
    form.categoria.value = isEdit ? product.categoria || CATEGORIAS_VALIDAS[0] : CATEGORIAS_VALIDAS[0];
    form.tipoPielRecomendada.value = isEdit
        ? product.tipoPielRecomendada || TIPOS_PIEL_VALIDOS[0]
        : TIPOS_PIEL_VALIDOS[0];
    form.precioReferenciaUSD.value = isEdit ? product.precioReferenciaUSD ?? "" : "8.50";
    form.precioReferenciaGTQ.value = isEdit ? product.precioReferenciaGTQ ?? "" : "65.00";
    form.disponibilidadPais.value = isEdit ? product.disponibilidadPais || "Ambos" : "Ambos";
    form.stockEstado.value = isEdit ? product.stockEstado || "En Stock" : "En Stock";
    form.ingredientesClave.value = isEdit ? product.ingredientesClave || "" : "";
    form.descripcion.value = isEdit ? product.descripcion || "" : "";
    form.imagenUrl.value = isEdit
        ? product.imagenUrl || AVAILABLE_LOCAL_IMAGES[0].path
        : AVAILABLE_LOCAL_IMAGES[0].path;
    form.destacado.checked = isEdit ? Boolean(product.destacado) : false;

    if (previewImg) {
        previewImg.src = form.imagenUrl.value;
    }

    modal.classList.add("active");
}

/**
 * Maneja la eliminación de un producto con diálogo de confirmación (Exclusivo Admin).
 * @param {Object} product Producto a eliminar.
 * @param {Function} onCatalogChanged Callback tras eliminar.
 */
export async function handleDeleteProduct(product, onCatalogChanged) {
    const confirmed = await confirmDialog({
        title: "Eliminar Producto del Catálogo",
        message: `¿Estás seguro de eliminar permanentemente "${product.nombre}" del catálogo regional de Bioaqua? Esta acción no se puede deshacer.`,
        confirmText: "Sí, eliminar producto",
        cancelText: "Cancelar",
        danger: true
    });

    if (!confirmed) return;

    try {
        await deleteProduct(product.id);
        showToast(`Producto "${product.nombre}" eliminado correctamente.`, "success");
        if (typeof onCatalogChanged === "function") await onCatalogChanged();
    } catch (err) {
        showToast(err.message, "error");
    }
}

/**
 * Crea el modal de formulario CRUD de Productos en el DOM si aún no existe.
 */
function ensureProductCrudModalInDOM(onCatalogChanged) {
    let modal = document.getElementById("bio-product-crud-modal");
    if (modal) {
        modal._onCatalogChanged = onCatalogChanged;
        return;
    }

    modal = document.createElement("div");
    modal.id = "bio-product-crud-modal";
    modal.className = "bio-modal-overlay";
    modal._onCatalogChanged = onCatalogChanged;

    const categoriasOptions = CATEGORIAS_VALIDAS.map(
        (c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`
    ).join("");

    const pielOptions = TIPOS_PIEL_VALIDOS.map(
        (p) => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`
    ).join("");

    const lineasOptions = LINEAS_BIOAQUA.map(
        (l) => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`
    ).join("");

    const presetImagesOptions = AVAILABLE_LOCAL_IMAGES.map(
        (img) => `<option value="${escapeHTML(img.path)}">${escapeHTML(img.label)} (${escapeHTML(img.path)})</option>`
    ).join("");

    modal.innerHTML = `
        <div class="bio-modal bio-modal--lg">
            <div class="bio-modal__header">
                <div>
                    <span class="bio-modal__eyebrow">ADMINISTRACIÓN DE CATÁLOGO (COLECCIÓN: PRODUCTOS)</span>
                    <h3 id="bio-crud-modal-title">Registrar Nuevo Producto Bioaqua</h3>
                </div>
                <button type="button" class="bio-modal__close" id="bio-crud-close">×</button>
            </div>
            <div class="bio-modal__body">
                <div id="bio-crud-errors" class="bio-form-errors" aria-live="assertive"></div>
                <form id="bio-form-product-crud" class="bio-form" novalidate>
                    <div class="bio-form-row">
                        <div class="bio-form-group" style="flex: 2;">
                            <label for="crud-nombre">Nombre del Producto *</label>
                            <input type="text" id="crud-nombre" name="nombre" placeholder="Ej. Suero de Retinol Antiedad Bioaqua" required>
                        </div>
                        <div class="bio-form-group" style="flex: 1;">
                            <label for="crud-linea">Línea Bioaqua *</label>
                            <select id="crud-linea" name="linea" required>
                                ${lineasOptions}
                            </select>
                        </div>
                    </div>

                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="crud-categoria">Categoría *</label>
                            <select id="crud-categoria" name="categoria" required>
                                ${categoriasOptions}
                            </select>
                        </div>
                        <div class="bio-form-group">
                            <label for="crud-piel">Tipo de Piel Recomendada *</label>
                            <select id="crud-piel" name="tipoPielRecomendada" required>
                                ${pielOptions}
                            </select>
                        </div>
                        <div class="bio-form-group">
                            <label for="crud-pais">Disponibilidad por País *</label>
                            <select id="crud-pais" name="disponibilidadPais" required>
                                <option value="Ambos">🇸🇻 🇬🇹 Ambos Países (SV y GT)</option>
                                <option value="SV">🇸🇻 Exclusivo El Salvador (SV)</option>
                                <option value="GT">🇬🇹 Exclusivo Guatemala (GT)</option>
                            </select>
                        </div>
                    </div>

                    <div class="bio-form-row">
                        <div class="bio-form-group">
                            <label for="crud-usd">Precio Ref. El Salvador ($ USD) *</label>
                            <input type="number" id="crud-usd" name="precioReferenciaUSD" step="0.05" min="0.50" max="500" placeholder="8.50" required>
                        </div>
                        <div class="bio-form-group">
                            <label for="crud-gtq">Precio Ref. Guatemala (Q GTQ) *</label>
                            <input type="number" id="crud-gtq" name="precioReferenciaGTQ" step="0.50" min="1" max="4000" placeholder="65.00" required>
                        </div>
                        <div class="bio-form-group">
                            <label for="crud-stock">Estado de Stock *</label>
                            <select id="crud-stock" name="stockEstado" required>
                                ${ESTADOS_STOCK.map((s) => `<option value="${s}">${s}</option>`).join("")}
                            </select>
                        </div>
                    </div>

                    <div class="bio-form-group">
                        <label for="crud-ingredientes">Ingredientes Activos Clave *</label>
                        <input type="text" id="crud-ingredientes" name="ingredientesClave" placeholder="Ej. Ácido Hialurónico 2%, Niacinamida, Extracto de Centella Asiática" required>
                    </div>

                    <div class="bio-form-group">
                        <label for="crud-descripcion">Descripción y Beneficios *</label>
                        <textarea id="crud-descripcion" name="descripcion" rows="3" placeholder="Describe los beneficios dermatológicos y modo de acción en el clima centroamericano..." required></textarea>
                    </div>

                    <div class="bio-form-row" style="align-items: center;">
                        <div class="bio-form-group" style="flex: 2;">
                            <label for="crud-preset-img">Seleccionar imagen oficial del repositorio (o escribe ruta/URL abajo):</label>
                            <select id="crud-preset-img">
                                <option value="">-- Elegir imagen predefinida de Bioaqua --</option>
                                ${presetImagesOptions}
                            </select>
                            <label for="crud-imagen" style="margin-top: 0.5rem;">Ruta local o URL de Imagen *</label>
                            <input type="text" id="crud-imagen" name="imagenUrl" placeholder="img/suero-acido-hialuronico-clean.png" required>
                        </div>
                        <div class="bio-crud-preview-box">
                            <img id="bio-crud-img-preview" src="img/suero-acido-hialuronico-clean.png" alt="Vista previa">
                        </div>
                    </div>

                    <div class="bio-form-check">
                        <input type="checkbox" id="crud-destacado" name="destacado">
                        <label for="crud-destacado">⭐ Marcar como producto <strong>Best Seller / Destacado</strong> en la parte superior del catálogo</label>
                    </div>

                    <div class="bio-modal__footer">
                        <button type="button" class="bio-btn bio-btn--outline" id="btn-crud-cancel">Cancelar</button>
                        <button type="submit" class="bio-btn bio-btn--primary" id="btn-crud-save">Guardar Producto en Catálogo</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.classList.remove("active");
    modal.querySelector("#bio-crud-close")?.addEventListener("click", closeModal);
    modal.querySelector("#btn-crud-cancel")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // Sincronizar selector de imágenes locales con el input y vista previa
    const presetSelect = modal.querySelector("#crud-preset-img");
    const imgInput = modal.querySelector("#crud-imagen");
    const previewImg = modal.querySelector("#bio-crud-img-preview");

    presetSelect?.addEventListener("change", () => {
        if (presetSelect.value) {
            imgInput.value = presetSelect.value;
            previewImg.src = presetSelect.value;
        }
    });

    imgInput?.addEventListener("input", () => {
        if (imgInput.value.trim()) {
            previewImg.src = imgInput.value.trim();
        }
    });

    // Auto-calcular sugerencia en Quetzales si cambia USD (tasa ref ~7.80 GTQ/USD)
    const usdInput = modal.querySelector("#crud-usd");
    const gtqInput = modal.querySelector("#crud-gtq");
    usdInput?.addEventListener("input", () => {
        const usdVal = parseFloat(usdInput.value);
        if (!Number.isNaN(usdVal) && usdVal > 0 && !gtqInput.dataset.touched) {
            gtqInput.value = Math.round(usdVal * 7.8);
        }
    });
    gtqInput?.addEventListener("input", () => {
        gtqInput.dataset.touched = "true";
    });

    // Submit del formulario CRUD con validación personalizada JS
    const form = modal.querySelector("#bio-form-product-crud");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorBox = document.getElementById("bio-crud-errors");
        const saveBtn = document.getElementById("btn-crud-save");

        const rawData = {
            nombre: form.nombre.value,
            linea: form.linea.value,
            categoria: form.categoria.value,
            tipoPielRecomendada: form.tipoPielRecomendada.value,
            precioReferenciaUSD: form.precioReferenciaUSD.value,
            precioReferenciaGTQ: form.precioReferenciaGTQ.value,
            disponibilidadPais: form.disponibilidadPais.value,
            stockEstado: form.stockEstado.value,
            ingredientesClave: form.ingredientesClave.value,
            descripcion: form.descripcion.value,
            imagenUrl: form.imagenUrl.value,
            destacado: form.destacado.checked
        };

        const validation = validateProductForm(rawData);
        if (!validation.isValid) {
            renderFormErrors(errorBox, validation.errors);
            return;
        }

        try {
            errorBox.innerHTML = "";
            saveBtn.disabled = true;
            saveBtn.textContent = "Guardando en Firestore...";

            const editId = form.dataset.editId;
            if (editId) {
                await updateProduct(editId, validation.sanitized);
                showToast(`Producto "${validation.sanitized.nombre}" actualizado con éxito.`, "success");
            } else {
                await createProduct(validation.sanitized);
                showToast(`Producto "${validation.sanitized.nombre}" agregado al catálogo.`, "success");
            }

            closeModal();
            if (typeof modal._onCatalogChanged === "function") {
                await modal._onCatalogChanged();
            }
        } catch (err) {
            renderFormErrors(errorBox, [err.message]);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar Producto en Catálogo";
        }
    });
}

