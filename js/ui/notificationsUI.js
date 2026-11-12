/**
 * ============================================================================
 * ARCHIVO: js/ui/notificationsUI.js
 * RESPONSABILIDAD: Gestión de estados visuales de la interfaz:
 * - Notificaciones flotantes (Toasts de éxito, error, alerta e info)
 * - Estados de carga (Spinners y Skeletons para catálogo y paneles)
 * - Estados vacíos ("Empty States" cuando no hay resultados o datos)
 * - Cuadros de diálogo de confirmación accesibles
 * ============================================================================
 */

/**
 * Asegura que exista el contenedor global de notificaciones Toast en el DOM.
 * @returns {HTMLElement}
 */
function getToastContainer() {
    let container = document.getElementById("bioaqua-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "bioaqua-toast-container";
        container.className = "bio-toast-container";
        container.setAttribute("aria-live", "polite");
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Muestra una notificación visual (Toast) en la esquina superior derecha.
 * @param {string} message Mensaje a mostrar.
 * @param {'success'|'error'|'warning'|'info'} type Tipo de notificación.
 * @param {number} duration Duración en milisegundos.
 */
export function showToast(message, type = "info", duration = 4200) {
    const container = getToastContainer();

    const icons = {
        success: "✓",
        error: "✕",
        warning: "⚠",
        info: "ℹ"
    };

    const toast = document.createElement("div");
    toast.className = `bio-toast bio-toast--${type}`;
    toast.setAttribute("role", "status");

    const iconSpan = document.createElement("span");
    iconSpan.className = "bio-toast__icon";
    iconSpan.textContent = icons[type] || icons.info;

    const textDiv = document.createElement("div");
    textDiv.className = "bio-toast__text";
    textDiv.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "bio-toast__close";
    closeBtn.setAttribute("aria-label", "Cerrar notificación");
    closeBtn.textContent = "×";

    const removeToast = () => {
        toast.classList.add("bio-toast--closing");
        setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener("click", removeToast);

    toast.append(iconSpan, textDiv, closeBtn);
    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
}

/**
 * Renderiza un estado de carga con tarjetas Skeleton y Spinner dentro de un contenedor.
 * @param {HTMLElement} container Contenedor del DOM donde se mostrará la carga.
 * @param {string} message Mensaje descriptivo de la operación asíncrona.
 * @param {number} skeletonCount Cantidad de tarjetas skeleton a mostrar.
 */
export function renderLoadingState(container, message = "Consultando catálogo Bioaqua...", skeletonCount = 6) {
    if (!container) return;

    const skeletonsHTML = Array.from({ length: skeletonCount })
        .map(
            () => `
        <div class="bio-skeleton-card" aria-hidden="true">
            <div class="bio-skeleton bio-skeleton--img"></div>
            <div class="bio-skeleton bio-skeleton--title"></div>
            <div class="bio-skeleton bio-skeleton--text"></div>
            <div class="bio-skeleton bio-skeleton--text short"></div>
            <div class="bio-skeleton-tags">
                <span class="bio-skeleton bio-skeleton--pill"></span>
                <span class="bio-skeleton bio-skeleton--pill"></span>
            </div>
        </div>
    `
        )
        .join("");

    container.innerHTML = `
        <div class="bio-loading-wrapper" role="status" aria-live="polite">
            <div class="bio-spinner-header">
                <span class="bio-spinner"></span>
                <p>${message}</p>
            </div>
            <div class="bio-skeleton-grid">
                ${skeletonsHTML}
            </div>
        </div>
    `;
}

/**
 * Renderiza un estado vacío ("Empty State") claro y amigable cuando no hay datos.
 * @param {HTMLElement} container Contenedor del DOM.
 * @param {Object} options Configuración del estado vacío.
 * @param {string} [options.icon] Emoji o icono representativo.
 * @param {string} options.title Título principal.
 * @param {string} options.message Explicación o sugerencia.
 * @param {string} [options.actionText] Texto del botón de acción opcional.
 * @param {Function} [options.onAction] Callback al hacer clic en el botón.
 */
export function renderEmptyState(container, { icon = "✨", title, message, actionText = "", onAction = null }) {
    if (!container) return;

    container.innerHTML = `
        <div class="bio-empty-state">
            <div class="bio-empty-state__icon" aria-hidden="true">${icon}</div>
            <h4 class="bio-empty-state__title">${title}</h4>
            <p class="bio-empty-state__message">${message}</p>
            ${
                actionText
                    ? `<button type="button" class="bio-btn bio-btn--primary bio-empty-state__btn">${actionText}</button>`
                    : ""
            }
        </div>
    `;

    if (actionText && typeof onAction === "function") {
        const btn = container.querySelector(".bio-empty-state__btn");
        if (btn) btn.addEventListener("click", onAction);
    }
}

/**
 * Muestra un modal de confirmación personalizado y devuelve una Promesa booleana.
 * @param {Object} options Opciones del diálogo.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
    title = "¿Confirmar acción?",
    message = "¿Estás seguro de que deseas continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    danger = false
}) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "bio-modal-overlay active";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");

        overlay.innerHTML = `
            <div class="bio-modal bio-modal--sm">
                <div class="bio-modal__header">
                    <h3>${title}</h3>
                </div>
                <div class="bio-modal__body">
                    <p class="bio-confirm-message">${message}</p>
                </div>
                <div class="bio-modal__footer">
                    <button type="button" class="bio-btn bio-btn--outline" data-action="cancel">${cancelText}</button>
                    <button type="button" class="bio-btn ${danger ? "bio-btn--danger" : "bio-btn--primary"}" data-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;

        const cleanup = (result) => {
            overlay.remove();
            resolve(result);
        };

        overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => cleanup(false));
        overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => cleanup(true));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) cleanup(false);
        });

        document.body.appendChild(overlay);
    });
}

