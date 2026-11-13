/**
 * ============================================================================
 * ARCHIVO: js/consultas.js
 * RESPONSABILIDAD: Interacción asíncrona del formulario de `contacto.html`
 * con la colección `consultas` en Cloud Firestore (Firebase).
 * Incluye vinculación automática con el `uid` del usuario autenticado,
 * validaciones frontend, estado de carga ("Enviando...") y notificaciones Toast.
 * ============================================================================
 */

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db, auth } from "./config/firebaseConfig.js";
import { getCurrentUser, subscribeToAuthChanges } from "./services/authService.js";
import { validarFormularioContacto } from "./validaciones.js";
import { showToast } from "./ui/notificationsUI.js";

const COLLECTION_NAME = "consultas";

/**
 * Inicializa la lógica del formulario de contacto y suscribe el evento `submit`.
 */
export function initConsultasForm() {
    const form = document.getElementById("form-contacto") || document.querySelector(".form-container form");
    if (!form || form.dataset.boundConsultas === "true") return;

    form.dataset.boundConsultas = "true";

    // Si hay un usuario autenticado, autocompletar nombre, email y código de país si están vacíos
    subscribeToAuthChanges((userProfile) => {
        if (!userProfile) return;

        const inputNombre = form.querySelector("#nombre");
        const inputEmail = form.querySelector("#email");
        const selectCodigo = form.querySelector("#codigo_pais");

        if (inputNombre && !inputNombre.value.trim() && userProfile.nombre) {
            inputNombre.value = userProfile.nombre;
        }
        if (inputEmail && !inputEmail.value.trim() && userProfile.email) {
            inputEmail.value = userProfile.email;
        }
        if (selectCodigo && userProfile.pais === "Guatemala") {
            selectCodigo.value = "+502";
        } else if (selectCodigo && userProfile.pais === "El Salvador") {
            selectCodigo.value = "+503";
        }
    });

    form.addEventListener("submit", handleConsultaSubmit);
}

/**
 * Manejador asíncrono (`async/await`) del envío del formulario hacia Firestore.
 * @param {SubmitEvent} event
 */
async function handleConsultaSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitBtn =
        document.getElementById("btn-enviar-contacto") ||
        form.querySelector('button[type="submit"]');

    // 1. Recolectar los datos del formulario
    const formData = {
        nombre: form.querySelector("#nombre")?.value || "",
        email: form.querySelector("#email")?.value || "",
        codigo_pais: form.querySelector("#codigo_pais")?.value || "+503",
        celular: form.querySelector("#celular")?.value || "",
        asunto: form.querySelector("#asunto")?.value || "",
        mensaje: form.querySelector("#mensaje")?.value || ""
    };

    // 2. Validar los datos antes de enviarlos a Firebase
    const validacion = validarFormularioContacto(formData);
    if (!validacion.esValido) {
        showToast(validacion.errores[0], "warning", 4500);
        return;
    }

    // 3. Verificar si existe un usuario autenticado para vincular su UID
    const currentUser = getCurrentUser();
    const activeUid = currentUser?.uid || auth.currentUser?.uid || null;
    const activeRol = currentUser?.rol || (activeUid ? "cliente" : "visitante");

    // 4. Construir el documento para la colección `consultas`
    const nuevaConsulta = {
        ...validacion.datosLimpios,
        uid: activeUid,
        rolUsuario: activeRol,
        estado: "pendiente",
        createdAt: serverTimestamp()
    };

    const textoOriginalBtn = submitBtn ? submitBtn.textContent : "Enviar Mensaje";

    try {
        // Feedback visual (UX): Deshabilitar botón y mostrar estado "Enviando..."
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Enviando...";
        }

        // Guardar documento en la colección `consultas` de Cloud Firestore
        await addDoc(collection(db, COLLECTION_NAME), nuevaConsulta);

        // Mostrar notificación dinámica de éxito y limpiar el formulario
        showToast("¡Tu mensaje ha sido enviado correctamente!", "success", 5000);
        form.reset();
    } catch (error) {
        console.error("Error al guardar la consulta en Firestore:", error);
        showToast(
            "No se pudo enviar tu mensaje en este momento. Verifica tu conexión e inténtalo de nuevo.",
            "error",
            5000
        );
    } finally {
        // Restaurar el estado del botón al finalizar la operación asíncrona
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = textoOriginalBtn;
        }
    }
}

// Auto-inicializar al cargar el DOM si el script se incluye directamente en `contacto.html`
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initConsultasForm);
} else {
    initConsultasForm();
}

