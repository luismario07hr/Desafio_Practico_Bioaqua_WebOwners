/**
 * ============================================================================
 * ARCHIVO: js/ui/clientRoutineUI.js
 * RESPONSABILIDAD: Proceso 2 - Armador de Rutina Personalizada de Skincare
 * ("Mi Rutina Bioaqua SV/GT") y Sistema de Reseñas y Valoraciones de Clientes.
 * ============================================================================
 */

import {
    getUserRoutine,
    addOrUpdateRoutineStep,
    removeStepFromRoutine,
    updateRoutineTitle,
    createReview,
    deleteReview
} from "../services/routineService.js";
import { validateRoutineStepForm, validateReviewForm } from "../utils/validators.js";
import { calculateRoutineTotals } from "../utils/dataProcessor.js";
import { showToast, renderEmptyState, confirmDialog } from "./notificationsUI.js";
import { openAuthModal, renderFormErrors, escapeHTML, getActiveRegion } from "./navbarUI.js";

let activeRoutineScheduleFilter = "Todos"; // 'Todos' | 'Día' | 'Noche'

/**
 * Renderiza la sección "Mi Rutina Bioaqua" en la página de productos.
 * Calcula automáticamente el costo total estimado de la rutina en USD ($) y Quetzales (Q).
 *
 * @param {HTMLElement} container Contenedor DOM de la sección de rutina.
 * @param {Object|null} user Perfil del usuario actual.
 * @param {Array<Object>} allProducts Todos los productos del catálogo.
 * @param {Function} onDataChanged Callback para actualizar indicadores cuando cambia la rutina.
 */
export async function renderClientRoutineSection(container, user, allProducts, onDataChanged) {
    if (!container) return;

    // 1. Si es visitante no autenticado: mostrar invitación interactiva para iniciar sesión
    if (!user) {
        container.innerHTML = `
            <div class="bio-routine-panel bio-routine-panel--guest" id="mi-rutina-section">
                <div class="bio-routine-guest-content">
                    <span class="bio-routine-eyebrow">🧴 PROCESO 2 · ARMADOR DE RUTINA PERSONALIZADA BIOAQUA</span>
                    <h3>¿Quieres armar tu Ritual de Skincare de Día y Noche?</h3>
                    <p>
                        Inicia sesión o regístrate gratis como <strong>Cliente</strong> para guardar tus productos favoritos,
                        organizar tus pasos de <strong>Día ☀️ y Noche 🌙</strong>, calcular tu presupuesto estimado en
                        <strong>Dólares ($ USD)</strong> o <strong>Quetzales (Q GTQ)</strong> y publicar reseñas.
                    </p>
                    <div class="bio-routine-guest-actions">
                        <button type="button" class="bio-btn bio-btn--cyan" id="btn-guest-login-routine">
                            Iniciar Sesión para Armar mi Rutina
                        </button>
                        <button type="button" class="bio-btn bio-btn--outline-light" id="btn-guest-register-routine">
                            Crear Cuenta Gratis
                        </button>
                    </div>
                </div>
            </div>
        `;

        container
            .querySelector("#btn-guest-login-routine")
            ?.addEventListener("click", () => openAuthModal("login"));
        container
            .querySelector("#btn-guest-register-routine")
            ?.addEventListener("click", () => openAuthModal("register"));
        return;
    }

    // 2. Usuario autenticado: consultar su rutina en Firestore y calcular totales con JS nativo
    const routineDoc = await getUserRoutine(user.uid);
    const stats = calculateRoutineTotals(routineDoc.pasos || [], allProducts);
    const activeRegion = getActiveRegion();

    // Filtrar pasos según pestaña Día / Noche seleccionada
    const visibleSteps = stats.detailedSteps.filter((step) => {
        if (activeRoutineScheduleFilter === "Día") {
            return step.horario === "Día" || step.horario === "Día y Noche";
        }
        if (activeRoutineScheduleFilter === "Noche") {
            return step.horario === "Noche" || step.horario === "Día y Noche";
        }
        return true;
    });

    container.innerHTML = `
        <div class="bio-routine-panel" id="mi-rutina-section">
            <div class="bio-routine-header">
                <div class="bio-routine-title-box">
                    <span class="bio-routine-eyebrow">
                        🧴 MI RITUAL PERSONALIZADO · ${escapeHTML(user.nombre.toUpperCase())} (PIEL ${escapeHTML((user.tipoPiel || "MIXTA").toUpperCase())})
                    </span>
                    <div class="bio-routine-name-row">
                        <h3 id="routine-display-name">${escapeHTML(routineDoc.nombreRutina || "Mi Ritual Bioaqua")}</h3>
                        <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" id="btn-edit-routine-title" title="Cambiar nombre de mi rutina">
                            ✎ Renombrar
                        </button>
                    </div>
                </div>

                <!-- BLOQUE DE INDICADORES DE LA RUTINA (Calculados con JS en USD y GTQ) -->
                <div class="bio-routine-kpis">
                    <div class="bio-routine-kpi ${activeRegion === "SV" ? "highlight" : ""}">
                        <span class="bio-routine-kpi__label">🇸🇻 Costo Estimado SV</span>
                        <strong class="bio-routine-kpi__value">$${stats.totalUSD.toFixed(2)} USD</strong>
                    </div>
                    <div class="bio-routine-kpi ${activeRegion === "GT" ? "highlight" : ""}">
                        <span class="bio-routine-kpi__label">🇬🇹 Costo Estimado GT</span>
                        <strong class="bio-routine-kpi__value">Q${stats.totalGTQ.toFixed(2)} GTQ</strong>
                    </div>
                    <div class="bio-routine-kpi">
                        <span class="bio-routine-kpi__label">Pasos Configurados</span>
                        <strong class="bio-routine-kpi__value">${stats.totalPasos} (${stats.pasosDia} ☀️ / ${stats.pasosNoche} 🌙)</strong>
                    </div>
                </div>
            </div>

            <!-- FILTROS DE HORARIO DE LA RUTINA -->
            <div class="bio-routine-toolbar">
                <div class="bio-routine-tabs" role="tablist">
                    <button type="button" class="bio-routine-tab ${
                        activeRoutineScheduleFilter === "Todos" ? "active" : ""
                    }" data-schedule="Todos">
                        Todos los pasos (${stats.totalPasos})
                    </button>
                    <button type="button" class="bio-routine-tab ${
                        activeRoutineScheduleFilter === "Día" ? "active" : ""
                    }" data-schedule="Día">
                        ☀️ Rutina de Día (${stats.pasosDia})
                    </button>
                    <button type="button" class="bio-routine-tab ${
                        activeRoutineScheduleFilter === "Noche" ? "active" : ""
                    }" data-schedule="Noche">
                        🌙 Rutina de Noche (${stats.pasosNoche})
                    </button>
                </div>
                <span class="bio-routine-hint">
                    💡 Usa el botón <strong>"+ Mi Rutina"</strong> en cualquier tarjeta del catálogo inferior para añadir productos.
                </span>
            </div>

            <!-- CONTENEDOR DE PASOS DE LA RUTINA -->
            <div id="bio-routine-steps-container" class="bio-routine-steps-grid"></div>
        </div>
    `;

    const stepsContainer = container.querySelector("#bio-routine-steps-container");

    if (visibleSteps.length === 0) {
        renderEmptyState(stepsContainer, {
            icon: "🧴",
            title:
                stats.totalPasos === 0
                    ? "Tu rutina Bioaqua aún no tiene productos asignados"
                    : `No tienes pasos configurados para el horario: ${activeRoutineScheduleFilter}`,
            message:
                stats.totalPasos === 0
                    ? "Explora el catálogo inferior y haz clic en '+ Mi Rutina' en los limpiadores, sérums, cremas o bloqueadores que desees incorporar."
                    : "Cambia a la pestaña 'Todos los pasos' o agrega un producto para este horario."
        });
    } else {
        stepsContainer.innerHTML = visibleSteps
            .map((step, index) => {
                const prod = step.producto;
                const badgeIcon =
                    step.horario === "Día" ? "☀️ Día" : step.horario === "Noche" ? "🌙 Noche" : "☀️🌙 Día y Noche";

                return `
                    <article class="bio-routine-step-card">
                        <div class="bio-routine-step-card__header">
                            <span class="bio-step-number">PASO 0${index + 1}</span>
                            <span class="bio-step-schedule-badge">${badgeIcon}</span>
                        </div>
                        <div class="bio-routine-step-card__body">
                            <img src="${escapeHTML(prod.imagenUrl)}" alt="${escapeHTML(prod.nombre)}" loading="lazy">
                            <div class="bio-routine-step-card__info">
                                <h4>${escapeHTML(prod.nombre)}</h4>
                                <span class="bio-step-meta">${escapeHTML(prod.categoria)} · Línea ${escapeHTML(prod.linea)}</span>
                                <p class="bio-step-prices">
                                    <strong>🇸🇻 $${Number(prod.precioReferenciaUSD).toFixed(2)}</strong>
                                    <span>|</span>
                                    <strong>🇬🇹 Q${Number(prod.precioReferenciaGTQ).toFixed(2)}</strong>
                                </p>
                                <p class="bio-step-notes">
                                    ${
                                        step.notas
                                            ? `<em>"${escapeHTML(step.notas)}"</em>`
                                            : `<span class="text-muted">Sin notas personales de aplicación.</span>`
                                    }
                                </p>
                            </div>
                        </div>
                        <div class="bio-routine-step-card__footer">
                            <button type="button" class="bio-btn bio-btn--xs bio-btn--outline" data-action="edit-step" data-product-id="${escapeHTML(prod.id)}">
                                ✎ Horario / Nota
                            </button>
                            <button type="button" class="bio-btn bio-btn--xs bio-btn--danger-outline" data-action="remove-step" data-product-id="${escapeHTML(prod.id)}">
                                ✕ Quitar
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    // Eventos de pestañas Día / Noche
    container.querySelectorAll(".bio-routine-tab").forEach((tabBtn) => {
        tabBtn.addEventListener("click", () => {
            activeRoutineScheduleFilter = tabBtn.dataset.schedule || "Todos";
            renderClientRoutineSection(container, user, allProducts, onDataChanged);
        });
    });

    // Evento renombrar rutina
    container.querySelector("#btn-edit-routine-title")?.addEventListener("click", async () => {
        const currentTitle = routineDoc.nombreRutina || "Mi Ritual Bioaqua";
        const newTitle = window.prompt("Ingresa el nombre personalizado para tu rutina Bioaqua:", currentTitle);
        if (newTitle && newTitle.trim().length >= 3) {
            try {
                await updateRoutineTitle(user.uid, newTitle.trim());
                showToast("Nombre de rutina actualizado.", "success");
                await renderClientRoutineSection(container, user, allProducts, onDataChanged);
            } catch (err) {
                showToast(err.message, "error");
            }
        } else if (newTitle !== null) {
            showToast("El nombre de la rutina debe tener al menos 3 caracteres.", "warning");
        }
    });

    // Eventos editar paso o quitar paso
    stepsContainer.querySelectorAll('[data-action="edit-step"]').forEach((btn) => {
        btn.addEventListener("click", () => {
            const pid = btn.dataset.productId;
            const stepData = stats.detailedSteps.find((s) => s.productoId === pid);
            if (stepData) {
                openAddRoutineModal(stepData.producto, user, stepData, async () => {
                    await renderClientRoutineSection(container, user, allProducts, onDataChanged);
                    if (typeof onDataChanged === "function") onDataChanged();
                });
            }
        });
    });

    stepsContainer.querySelectorAll('[data-action="remove-step"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
            const pid = btn.dataset.productId;
            const stepData = stats.detailedSteps.find((s) => s.productoId === pid);
            try {
                await removeStepFromRoutine(user.uid, pid);
                showToast(
                    `"${stepData?.producto?.nombre || "Producto"}" fue removido de tu rutina.`,
                    "info"
                );
                await renderClientRoutineSection(container, user, allProducts, onDataChanged);
                if (typeof onDataChanged === "function") onDataChanged();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    });
}

/**
 * Abre el modal para agregar o editar un producto dentro de "Mi Rutina Bioaqua".
 * @param {Object} product Producto seleccionado.
 * @param {Object|null} user Usuario actual.
 * @param {Object|null} existingStep Paso existente si se está editando.
 * @param {Function} onSaved Callback al guardar.
 */
export function openAddRoutineModal(product, user, existingStep = null, onSaved = null) {
    if (!user) {
        showToast("Inicia sesión o regístrate para armar tu Rutina Bioaqua personalizada.", "info");
        openAuthModal("login");
        return;
    }

    ensureRoutineStepModalInDOM();
    const modal = document.getElementById("bio-routine-step-modal");
    const form = document.getElementById("bio-form-routine-step");
    const titleEl = document.getElementById("bio-routine-modal-product-name");
    const errorBox = document.getElementById("bio-routine-step-errors");

    if (!modal || !form) return;
    if (errorBox) errorBox.innerHTML = "";

    modal._currentProduct = product;
    modal._currentUser = user;
    modal._onSaved = onSaved;

    titleEl.textContent = product.nombre;
    form.horario.value = existingStep ? existingStep.horario : "Día y Noche";
    form.notas.value = existingStep ? existingStep.notas || "" : "";

    modal.classList.add("active");
}

function ensureRoutineStepModalInDOM() {
    if (document.getElementById("bio-routine-step-modal")) return;

    const modal = document.createElement("div");
    modal.id = "bio-routine-step-modal";
    modal.className = "bio-modal-overlay";

    modal.innerHTML = `
        <div class="bio-modal bio-modal--sm">
            <div class="bio-modal__header">
                <div>
                    <span class="bio-modal__eyebrow">MI RUTINA BIOAQUA (GUARDADO EN FIRESTORE)</span>
                    <h3 id="bio-routine-modal-product-name">Agregar a Mi Rutina</h3>
                </div>
                <button type="button" class="bio-modal__close" id="bio-routine-step-close">×</button>
            </div>
            <div class="bio-modal__body">
                <div id="bio-routine-step-errors" class="bio-form-errors"></div>
                <form id="bio-form-routine-step" class="bio-form" novalidate>
                    <div class="bio-form-group">
                        <label for="routine-horario">Horario de aplicación *</label>
                        <select id="routine-horario" name="horario" required>
                            <option value="Día y Noche">☀️🌙 Día y Noche (Ambos horarios)</option>
                            <option value="Día">☀️ Solo Rutina de Día (Mañana)</option>
                            <option value="Noche">🌙 Solo Rutina de Noche (Antes de dormir)</option>
                        </select>
                    </div>
                    <div class="bio-form-group">
                        <label for="routine-notas">Notas personales de uso (Opcional, máx. 220 caracteres)</label>
                        <textarea id="routine-notas" name="notas" rows="3" placeholder="Ej. Aplicar 3 gotas después del tónico con toques suaves..."></textarea>
                    </div>
                    <div class="bio-modal__footer" style="padding: 0.5rem 0 0 0;">
                        <button type="button" class="bio-btn bio-btn--outline" id="btn-routine-step-cancel">Cancelar</button>
                        <button type="submit" class="bio-btn bio-btn--primary" id="btn-routine-step-save">Guardar en Mi Rutina</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.classList.remove("active");
    modal.querySelector("#bio-routine-step-close")?.addEventListener("click", close);
    modal.querySelector("#btn-routine-step-cancel")?.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
    });

    const form = modal.querySelector("#bio-form-routine-step");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const product = modal._currentProduct;
        const user = modal._currentUser;
        const errorBox = document.getElementById("bio-routine-step-errors");
        const saveBtn = document.getElementById("btn-routine-step-save");

        if (!product || !user) return;

        const stepInput = {
            productoId: product.id,
            horario: form.horario.value,
            notas: form.notas.value
        };

        const validation = validateRoutineStepForm(stepInput);
        if (!validation.isValid) {
            renderFormErrors(errorBox, validation.errors);
            return;
        }

        try {
            errorBox.innerHTML = "";
            saveBtn.disabled = true;
            saveBtn.textContent = "Guardando...";

            await addOrUpdateRoutineStep(user.uid, stepInput);
            showToast(`"${product.nombre}" guardado en tu rutina (${stepInput.horario}).`, "success");
            close();
            if (typeof modal._onSaved === "function") await modal._onSaved();
        } catch (err) {
            renderFormErrors(errorBox, [err.message]);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar en Mi Rutina";
        }
    });
}

/**
 * Abre el modal de Reseñas y Valoraciones (1-5 estrellas) de un producto específico.
 * Permite leer todas las opiniones de clientes SV/GT y publicar una nueva si está autenticado.
 *
 * @param {Object} product Producto a inspeccionar/reseñar.
 * @param {Array<Object>} allReviews Todas las reseñas cargadas.
 * @param {Object|null} user Usuario actual.
 * @param {Function} onReviewsChanged Callback tras crear o eliminar una reseña.
 */
export function openProductReviewsModal(product, allReviews, user, onReviewsChanged) {
    ensureReviewsModalInDOM();
    const modal = document.getElementById("bio-reviews-modal");
    if (!modal) return;

    modal._currentProduct = product;
    modal._currentUser = user;
    modal._onReviewsChanged = onReviewsChanged;

    const productReviews = (allReviews || []).filter((r) => r.productoId === product.id);
    renderReviewsModalContent(modal, product, productReviews, user);
    modal.classList.add("active");
}

function renderReviewsModalContent(modal, product, productReviews, user) {
    const titleEl = modal.querySelector("#bio-rev-product-title");
    const subtitleEl = modal.querySelector("#bio-rev-product-subtitle");
    const listContainer = modal.querySelector("#bio-rev-list-container");
    const formWrapper = modal.querySelector("#bio-rev-form-wrapper");

    const avg =
        productReviews.length > 0
            ? (
                  productReviews.reduce((acc, r) => acc + (Number(r.calificacion) || 0), 0) /
                  productReviews.length
              ).toFixed(1)
            : "Sin calificaciones aún";

    titleEl.textContent = product.nombre;
    subtitleEl.innerHTML = `
        Línea <strong>${escapeHTML(product.linea)}</strong> · Calificación Promedio:
        <strong>★ ${avg}</strong> (${productReviews.length} ${productReviews.length === 1 ? "reseña" : "reseñas"})
    `;

    // Renderizar lista de reseñas
    if (productReviews.length === 0) {
        renderEmptyState(listContainer, {
            icon: "💬",
            title: "Sé la primera persona en opinar sobre este producto",
            message: "Comparte tu experiencia con la comunidad Bioaqua de El Salvador y Guatemala."
        });
    } else {
        listContainer.innerHTML = productReviews
            .map((rev) => {
                const stars = "★".repeat(Number(rev.calificacion) || 5) + "☆".repeat(5 - (Number(rev.calificacion) || 5));
                const flag = rev.pais === "Guatemala" ? "🇬🇹 Guatemala" : "🇸🇻 El Salvador";
                const canDelete = user && (user.uid === rev.uid || user.rol === "admin");
                const formattedDate = rev.fecha
                    ? new Date(rev.fecha).toLocaleDateString("es-SV", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                      })
                    : "Reciente";

                return `
                    <article class="bio-review-item">
                        <div class="bio-review-item__header">
                            <div>
                                <strong>${escapeHTML(rev.nombreUsuario)}</strong>
                                <span class="bio-review-country">${flag}</span>
                            </div>
                            <div class="bio-review-stars" aria-label="${rev.calificacion} de 5 estrellas">
                                ${stars}
                            </div>
                        </div>
                        <p class="bio-review-item__comment">${escapeHTML(rev.comentario)}</p>
                        <div class="bio-review-item__footer">
                            <span>Publicado el ${formattedDate}</span>
                            ${
                                canDelete
                                    ? `<button type="button" class="bio-btn bio-btn--xs bio-btn--danger-outline" data-delete-review="${escapeHTML(rev.id)}">Eliminar</button>`
                                    : ""
                            }
                        </div>
                    </article>
                `;
            })
            .join("");

        listContainer.querySelectorAll("[data-delete-review]").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const revId = btn.dataset.deleteReview;
                const ok = await confirmDialog({
                    title: "Eliminar Reseña",
                    message: "¿Deseas eliminar esta reseña del producto?",
                    confirmText: "Sí, eliminar",
                    danger: true
                });
                if (!ok) return;
                try {
                    await deleteReview(revId);
                    showToast("Reseña eliminada correctamente.", "info");
                    modal.classList.remove("active");
                    if (typeof modal._onReviewsChanged === "function") await modal._onReviewsChanged();
                } catch (err) {
                    showToast(err.message, "error");
                }
            });
        });
    }

    // Renderizar formulario de nueva reseña según autenticación
    if (!user) {
        formWrapper.innerHTML = `
            <div class="bio-review-guest-prompt">
                <p>¿Ya probaste <strong>${escapeHTML(product.nombre)}</strong>? Inicia sesión para calificarlo y dejar tu reseña.</p>
                <button type="button" class="bio-btn bio-btn--primary bio-btn--sm" id="btn-rev-open-login">
                    Iniciar Sesión para Reseñar
                </button>
            </div>
        `;
        formWrapper.querySelector("#btn-rev-open-login")?.addEventListener("click", () => {
            modal.classList.remove("active");
            openAuthModal("login");
        });
    } else {
        formWrapper.innerHTML = `
            <form id="bio-form-new-review" class="bio-form bio-review-form" novalidate>
                <h4>Escribe tu reseña como ${escapeHTML(user.nombre)} (${escapeHTML(user.pais || "El Salvador")})</h4>
                <div id="bio-rev-errors" class="bio-form-errors"></div>
                <div class="bio-form-group">
                    <label for="rev-calificacion">Calificación (1 a 5 estrellas) *</label>
                    <select id="rev-calificacion" name="calificacion" required>
                        <option value="5">★★★★★ (5/5) - ¡Excelente! Me encantó</option>
                        <option value="4">★★★★☆ (4/5) - Muy bueno, cumple lo que promete</option>
                        <option value="3">★★★☆☆ (3/5) - Regular / Aceptable</option>
                        <option value="2">★★☆☆☆ (2/5) - No se adaptó a mi tipo de piel</option>
                        <option value="1">★☆☆☆☆ (1/5) - No lo recomiendo</option>
                    </select>
                </div>
                <div class="bio-form-group">
                    <label for="rev-comentario">Tu experiencia con el producto (mín. 10 caracteres) *</label>
                    <textarea id="rev-comentario" name="comentario" rows="3" placeholder="Cuéntanos cómo te funcionó según tu tipo de piel y clima..." required></textarea>
                </div>
                <button type="submit" class="bio-btn bio-btn--primary" id="btn-rev-submit">
                    Publicar Reseña
                </button>
            </form>
        `;

        const form = formWrapper.querySelector("#bio-form-new-review");
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const errorBox = formWrapper.querySelector("#bio-rev-errors");
            const submitBtn = formWrapper.querySelector("#btn-rev-submit");

            const reviewInput = {
                productoId: product.id,
                calificacion: form.calificacion.value,
                comentario: form.comentario.value
            };

            const validation = validateReviewForm(reviewInput);
            if (!validation.isValid) {
                renderFormErrors(errorBox, validation.errors);
                return;
            }

            try {
                errorBox.innerHTML = "";
                submitBtn.disabled = true;
                submitBtn.textContent = "Publicando reseña...";

                await createReview({
                    productoId: product.id,
                    uid: user.uid,
                    nombreUsuario: user.nombre,
                    pais: user.pais || "El Salvador",
                    calificacion: Number(form.calificacion.value),
                    comentario: form.comentario.value
                });

                showToast("¡Gracias por compartir tu reseña sobre este producto Bioaqua!", "success");
                modal.classList.remove("active");
                if (typeof modal._onReviewsChanged === "function") await modal._onReviewsChanged();
            } catch (err) {
                renderFormErrors(errorBox, [err.message]);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Publicar Reseña";
            }
        });
    }
}

function ensureReviewsModalInDOM() {
    if (document.getElementById("bio-reviews-modal")) return;

    const modal = document.createElement("div");
    modal.id = "bio-reviews-modal";
    modal.className = "bio-modal-overlay";

    modal.innerHTML = `
        <div class="bio-modal bio-modal--lg">
            <div class="bio-modal__header">
                <div>
                    <span class="bio-modal__eyebrow">OPINIONES VERIFICADAS BIOAQUA SV & GT</span>
                    <h3 id="bio-rev-product-title">Reseñas del Producto</h3>
                    <p id="bio-rev-product-subtitle" class="bio-modal__subtitle"></p>
                </div>
                <button type="button" class="bio-modal__close" id="bio-rev-close">×</button>
            </div>
            <div class="bio-modal__body">
                <div id="bio-rev-list-container" class="bio-reviews-list"></div>
                <hr class="bio-divider">
                <div id="bio-rev-form-wrapper"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.classList.remove("active");
    modal.querySelector("#bio-rev-close")?.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
    });
}

