/**
 * ============================================================================
 * ARCHIVO: js/ui/clientRoutineUI.js
 * RESPONSABILIDAD: Sistema de Reseñas y Valoraciones de Clientes para el
 * catálogo de productos Bioaqua.
 * ============================================================================
 */

import {
    createReview,
    deleteReview
} from "../services/routineService.js";
import { validateReviewForm } from "../utils/validators.js";
import { showToast, renderEmptyState, confirmDialog } from "./notificationsUI.js";
import { openAuthModal, renderFormErrors, escapeHTML } from "./navbarUI.js";

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

