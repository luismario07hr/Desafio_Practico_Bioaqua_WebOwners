/**
 * ============================================================================
 * ARCHIVO: js/utils/validators.js
 * RESPONSABILIDAD: Validaciones personalizadas en JS Nativo para formularios
 * de Autenticación, CRUD de Productos Bioaqua, Rutinas y Reseñas.
 * ============================================================================
 */

// Expresiones regulares de apoyo
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const IMAGE_URL_OR_PATH_REGEX = /^(https?:\/\/[^\s]+|img\/.+\.(png|jpg|jpeg|webp|svg|gif))$/i;

// Catálogos permitidos para garantizar integridad de datos
export const PAISES_VALIDOS = ["El Salvador", "Guatemala"];
export const DISPONIBILIDAD_PAISES = ["SV", "GT", "Ambos"];
export const TIPOS_PIEL_VALIDOS = ["Grasa", "Seca", "Mixta", "Sensible", "Todas"];
export const CATEGORIAS_VALIDAS = [
    "Limpiador",
    "Sérum",
    "Crema",
    "Mascarilla",
    "Tónico",
    "Exfoliante",
    "Cuidado Localizado",
    "Protección Solar",
    "Cuidado Capilar"
];
export const LINEAS_BIOAQUA = [
    "Ácido Hialurónico",
    "Arroz (Rice Raw Pulp)",
    "Vitamina C",
    "Pure Skin (Anti-Acné)",
    "Perlas Puras",
    "Retinol Antiedad",
    "Centella Asiática",
    "Proteína de Seda",
    "Solar & Defensa UV",
    "Botánica Capilar"
];
export const ESTADOS_STOCK = ["En Stock", "Stock Bajo", "Agotado"];

/**
 * Valida los campos del formulario de Registro de Usuario.
 * @param {Object} data Datos del formulario de registro.
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateRegisterForm(data) {
    const errors = [];
    const nombre = (data.nombre || "").trim();
    const email = (data.email || "").trim();
    const password = data.password || "";
    const confirmPassword = data.confirmPassword || "";
    const pais = (data.pais || "").trim();
    const tipoPiel = (data.tipoPiel || "").trim();

    if (nombre.length < 3) {
        errors.push("El nombre completo es obligatorio y debe tener al menos 3 caracteres.");
    }
    if (!EMAIL_REGEX.test(email)) {
        errors.push("Ingresa un correo electrónico válido (ejemplo: usuario@correo.com).");
    }
    if (password.length < 6) {
        errors.push("La contraseña debe tener un mínimo de 6 caracteres.");
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
        errors.push("Las contraseñas ingresadas no coinciden.");
    }
    if (!PAISES_VALIDOS.includes(pais)) {
        errors.push("Selecciona un país válido (El Salvador o Guatemala).");
    }
    if (!TIPOS_PIEL_VALIDOS.includes(tipoPiel)) {
        errors.push("Selecciona tu tipo de piel para personalizar tus recomendaciones.");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Valida los campos del formulario de Inicio de Sesión.
 * @param {Object} data Datos del formulario de login.
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateLoginForm(data) {
    const errors = [];
    const email = (data.email || "").trim();
    const password = data.password || "";

    if (!EMAIL_REGEX.test(email)) {
        errors.push("Ingresa un correo electrónico con formato válido.");
    }
    if (!password || password.length < 6) {
        errors.push("Ingresa tu contraseña (mínimo 6 caracteres).");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Valida los campos del formulario CRUD de Productos Bioaqua (Rol Admin).
 * @param {Object} product Datos del producto a crear o actualizar.
 * @returns {{ isValid: boolean, errors: string[], sanitized: Object }}
 */
export function validateProductForm(product) {
    const errors = [];

    const nombre = (product.nombre || "").trim();
    const linea = (product.linea || "").trim();
    const categoria = (product.categoria || "").trim();
    const tipoPielRecomendada = (product.tipoPielRecomendada || "").trim();
    const precioReferenciaUSD = Number(product.precioReferenciaUSD);
    const precioReferenciaGTQ = Number(product.precioReferenciaGTQ);
    const disponibilidadPais = (product.disponibilidadPais || "").trim();
    const stockEstado = (product.stockEstado || "").trim();
    const descripcion = (product.descripcion || "").trim();
    const ingredientesClave = (product.ingredientesClave || "").trim();
    const imagenUrl = (product.imagenUrl || "").trim();
    const destacado = Boolean(product.destacado);

    if (nombre.length < 4) {
        errors.push("El nombre del producto es obligatorio (mínimo 4 caracteres).");
    }
    if (!linea) {
        errors.push("Debes especificar la línea Bioaqua del producto (ej. Ácido Hialurónico, Arroz, Retinol).");
    }
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        errors.push("Selecciona una categoría válida para el producto.");
    }
    if (!TIPOS_PIEL_VALIDOS.includes(tipoPielRecomendada)) {
        errors.push("Selecciona el tipo de piel recomendada.");
    }
    if (Number.isNaN(precioReferenciaUSD) || precioReferenciaUSD <= 0 || precioReferenciaUSD > 500) {
        errors.push("El precio de referencia en USD (El Salvador) debe ser mayor a $0.00 y menor a $500.00.");
    }
    if (Number.isNaN(precioReferenciaGTQ) || precioReferenciaGTQ <= 0 || precioReferenciaGTQ > 4000) {
        errors.push("El precio de referencia en Quetzales (Guatemala) debe ser mayor a Q0.00 y menor a Q4,000.00.");
    }
    if (!DISPONIBILIDAD_PAISES.includes(disponibilidadPais)) {
        errors.push("Selecciona el país de disponibilidad (SV, GT o Ambos).");
    }
    if (!ESTADOS_STOCK.includes(stockEstado)) {
        errors.push("Selecciona un estado de stock válido (En Stock, Stock Bajo o Agotado).");
    }
    if (descripcion.length < 15) {
        errors.push("La descripción del producto debe tener al menos 15 caracteres.");
    }
    if (ingredientesClave.length < 3) {
        errors.push("Indica al menos un ingrediente activo clave (ej. Niacinamida, Ácido Hialurónico).");
    }
    if (!imagenUrl || !IMAGE_URL_OR_PATH_REGEX.test(imagenUrl)) {
        errors.push("Ingresa una URL de imagen válida (https://...) o una ruta local válida (img/archivo.png).");
    }

    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            nombre,
            linea,
            categoria,
            tipoPielRecomendada,
            precioReferenciaUSD: Number(precioReferenciaUSD.toFixed(2)),
            precioReferenciaGTQ: Number(precioReferenciaGTQ.toFixed(2)),
            disponibilidadPais,
            stockEstado,
            descripcion,
            ingredientesClave,
            imagenUrl,
            destacado
        }
    };
}

/**
 * Valida el formulario de publicación de Reseña y Calificación de un producto.
 * @param {Object} review Datos de la reseña.
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateReviewForm(review) {
    const errors = [];
    const productoId = (review.productoId || "").trim();
    const calificacion = Number(review.calificacion);
    const comentario = (review.comentario || "").trim();

    if (!productoId) {
        errors.push("No se identificó el producto a reseñar.");
    }
    if (Number.isNaN(calificacion) || calificacion < 1 || calificacion > 5) {
        errors.push("La calificación debe ser un valor entre 1 y 5 estrellas.");
    }
    if (comentario.length < 10) {
        errors.push("El comentario de la reseña debe tener al menos 10 caracteres para ayudar a otros usuarios.");
    }
    if (comentario.length > 500) {
        errors.push("El comentario no puede superar los 500 caracteres.");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

