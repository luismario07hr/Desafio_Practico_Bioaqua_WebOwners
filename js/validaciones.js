/**
 * ============================================================================
 * ARCHIVO: js/validaciones.js
 * RESPONSABILIDAD: Validaciones Frontend con JavaScript Nativo para el
 * formulario de contacto (`contacto.html`) antes de enviar datos a Firestore.
 * ============================================================================
 */

// Expresiones regulares de validación
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CELULAR_8_DIGITOS_REGEX = /^[0-9]{8}$/;
const CODIGOS_PAIS_VALIDOS = ["+503", "+502"];

/**
 * Verifica si un valor de texto está vacío.
 * @param {string} valor
 * @returns {boolean}
 */
export function estaVacio(valor) {
    return !valor || String(valor).trim().length === 0;
}

/**
 * Valida que el correo electrónico tenga un formato válido.
 * @param {string} email
 * @returns {boolean}
 */
export function esEmailValido(email) {
    return EMAIL_REGEX.test(String(email || "").trim());
}

/**
 * Valida que el número de celular contenga exactamente 8 dígitos numéricos.
 * @param {string} celular
 * @returns {boolean}
 */
export function esCelularValido(celular) {
    const limpio = String(celular || "").replace(/\s+/g, "");
    return CELULAR_8_DIGITOS_REGEX.test(limpio);
}

/**
 * Valida todos los campos del formulario de contacto antes de guardarlos en Firestore.
 * @param {Object} datos Objeto con { nombre, email, codigo_pais, celular, asunto, mensaje }
 * @returns {{ esValido: boolean, errores: string[], datosLimpios: Object }}
 */
export function validarFormularioContacto(datos = {}) {
    const errores = [];

    const nombre = String(datos.nombre || "").trim();
    const email = String(datos.email || "").trim().toLowerCase();
    const codigo_pais = String(datos.codigo_pais || "").trim();
    const celularLimpio = String(datos.celular || "").replace(/\s+/g, "");
    const asunto = String(datos.asunto || "").trim();
    const mensaje = String(datos.mensaje || "").trim();

    // 1. Verificar que ningún campo obligatorio esté vacío
    if (estaVacio(nombre)) {
        errores.push("El campo 'Nombre' es obligatorio.");
    } else if (nombre.length < 3) {
        errores.push("El nombre debe contener al menos 3 caracteres.");
    }

    if (estaVacio(email)) {
        errores.push("El campo 'Email' es obligatorio.");
    } else if (!esEmailValido(email)) {
        errores.push("Ingresa un correo electrónico con formato válido (ej. usuario@dominio.com).");
    }

    if (estaVacio(codigo_pais) || !CODIGOS_PAIS_VALIDOS.includes(codigo_pais)) {
        errores.push("Selecciona un código de país válido (+503 El Salvador o +502 Guatemala).");
    }

    if (estaVacio(celularLimpio)) {
        errores.push("El campo 'Celular' es obligatorio.");
    } else if (!esCelularValido(celularLimpio)) {
        errores.push("El número de celular debe contener exactamente 8 dígitos numéricos (ej. 70001234).");
    }

    if (estaVacio(asunto)) {
        errores.push("El campo 'Asunto' es obligatorio.");
    } else if (asunto.length < 4) {
        errores.push("El asunto debe tener al menos 4 caracteres.");
    }

    if (estaVacio(mensaje)) {
        errores.push("El campo 'Mensaje' es obligatorio.");
    } else if (mensaje.length < 10) {
        errores.push("El mensaje debe tener al menos 10 caracteres.");
    }

    return {
        esValido: errores.length === 0,
        errores,
        datosLimpios: {
            nombre,
            email,
            codigo_pais,
            celular: celularLimpio,
            telefonoCompleto: `${codigo_pais} ${celularLimpio}`,
            pais: codigo_pais === "+502" ? "Guatemala" : "El Salvador",
            asunto,
            mensaje
        }
    };
}

