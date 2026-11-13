/**
 * ============================================================================
 * ARCHIVO: js/utils/dataProcessor.js
 * RESPONSABILIDAD: Procesamiento de datos con JavaScript Nativo:
 * 1. Filtrado y búsqueda multicriterio en tiempo real (nombre, ingrediente,
 *    categoría, tipo de piel, línea, país SV/GT y estado de stock).
 * 2. Ordenamiento dinámico (por precio USD/GTQ, calificación promedio o nombre).
 * 3. Cálculo de indicadores (KPIs del catálogo regional, promedios de reseñas
 *    por producto y presupuesto total estimado de la rutina en USD y Quetzales).
 * ============================================================================
 */

/**
 * OPERACIÓN 1: Filtrado y búsqueda multicriterio de productos Bioaqua.
 * @param {Array<Object>} products Lista completa de productos.
 * @param {Object} filters Criterios activos de filtrado.
 * @param {string} [filters.search] Texto buscado (nombre, ingrediente clave o descripción).
 * @param {string} [filters.pais] 'SV', 'GT', 'Ambos' o 'Todos'.
 * @param {string} [filters.categoria] Categoría seleccionada o 'Todas'.
 * @param {string} [filters.tipoPiel] Tipo de piel seleccionada o 'Todas'.
 * @param {string} [filters.linea] Línea Bioaqua seleccionada o 'Todas'.
 * @param {string} [filters.stockEstado] Estado de stock o 'Todos'.
 * @returns {Array<Object>} Productos que cumplen simultáneamente todos los criterios.
 */
export function filterProducts(products, filters = {}) {
    if (!Array.isArray(products)) return [];

    const searchTerm = (filters.search || "").trim().toLowerCase();
    const pais = filters.pais || "Todos";
    const categoria = filters.categoria || "Todas";
    const tipoPiel = filters.tipoPiel || "Todas";
    const linea = filters.linea || "Todas";
    const stockEstado = filters.stockEstado || "Todos";

    return products.filter((product) => {
        // 1. Búsqueda textual en nombre, ingredientes clave, línea y descripción
        if (searchTerm) {
            const haystack = [
                product.nombre,
                product.ingredientesClave,
                product.descripcion,
                product.linea,
                product.categoria
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (!haystack.includes(searchTerm)) {
                return false;
            }
        }

        // 2. Filtro por País de disponibilidad (El Salvador 'SV', Guatemala 'GT' o 'Ambos')
        if (pais && pais !== "Todos") {
            if (pais === "SV" && product.disponibilidadPais !== "SV" && product.disponibilidadPais !== "Ambos") {
                return false;
            }
            if (pais === "GT" && product.disponibilidadPais !== "GT" && product.disponibilidadPais !== "Ambos") {
                return false;
            }
            if (pais === "Exclusivo-SV" && product.disponibilidadPais !== "SV") {
                return false;
            }
            if (pais === "Exclusivo-GT" && product.disponibilidadPais !== "GT") {
                return false;
            }
        }

        // 3. Filtro por Categoría
        if (categoria && categoria !== "Todas" && product.categoria !== categoria) {
            return false;
        }

        // 4. Filtro por Tipo de Piel Recomendada (si el producto es para 'Todas', aplica a cualquier piel,
        //    o coincidencia exacta cuando se filtra un tipo específico)
        if (tipoPiel && tipoPiel !== "Todas") {
            if (product.tipoPielRecomendada !== tipoPiel && product.tipoPielRecomendada !== "Todas") {
                return false;
            }
        }

        // 5. Filtro por Línea Bioaqua
        if (linea && linea !== "Todas" && product.linea !== linea) {
            return false;
        }

        // 6. Filtro por Estado de Stock
        if (stockEstado && stockEstado !== "Todos" && product.stockEstado !== stockEstado) {
            return false;
        }

        return true;
    });
}

/**
 * OPERACIÓN 2: Ordenamiento dinámico de productos según criterio y moneda activa.
 * @param {Array<Object>} products Lista de productos (puede incluir `ratingPromedio`).
 * @param {string} sortBy Criterio ('destacados', 'precio-asc', 'precio-desc', 'rating-desc', 'nombre-asc').
 * @param {'SV'|'GT'} activeRegion País activo para decidir si ordenar por USD o GTQ.
 * @returns {Array<Object>} Copia ordenada de la lista de productos.
 */
export function sortProducts(products, sortBy = "destacados", activeRegion = "SV") {
    const list = [...products];
    const priceKey = activeRegion === "GT" ? "precioReferenciaGTQ" : "precioReferenciaUSD";
    const getPrice = (p) => Number(p[priceKey] ?? p.precio) || 0;

    switch (sortBy) {
        case "precio-asc":
            return list.sort((a, b) => getPrice(a) - getPrice(b));

        case "precio-desc":
            return list.sort((a, b) => getPrice(b) - getPrice(a));

        case "rating-desc":
            return list.sort((a, b) => {
                const diff = (b.ratingPromedio || 0) - (a.ratingPromedio || 0);
                if (diff !== 0) return diff;
                return (b.totalResenas || 0) - (a.totalResenas || 0);
            });

        case "nombre-asc":
            return list.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

        case "destacados":
        default:
            return list.sort((a, b) => {
                if (Boolean(b.destacado) !== Boolean(a.destacado)) {
                    return b.destacado ? 1 : -1;
                }
                return (b.ratingPromedio || 0) - (a.ratingPromedio || 0);
            });
    }
}

/**
 * OPERACIÓN 3A: Calcula las estadísticas de calificación (promedio 1-5 y conteo)
 * para cada producto a partir de las reseñas almacenadas.
 * @param {Array<Object>} products Lista de productos.
 * @param {Array<Object>} reviews Lista de reseñas de clientes.
 * @returns {Array<Object>} Productos enriquecidos con `ratingPromedio` y `totalResenas`.
 */
export function enrichProductsWithRatings(products, reviews = []) {
    const statsByProduct = {};

    for (const rev of reviews) {
        const pid = rev.productoId;
        if (!pid) continue;
        if (!statsByProduct[pid]) {
            statsByProduct[pid] = { sum: 0, count: 0 };
        }
        statsByProduct[pid].sum += Number(rev.calificacion) || 0;
        statsByProduct[pid].count += 1;
    }

    return products.map((prod) => {
        const st = statsByProduct[prod.id];
        const avg = st && st.count > 0 ? Number((st.sum / st.count).toFixed(1)) : 0;
        return {
            ...prod,
            ratingPromedio: avg,
            totalResenas: st ? st.count : 0
        };
    });
}

/**
 * OPERACIÓN 3B: Calcula el bloque de Indicadores (KPIs) del Catálogo Regional Bioaqua.
 * @param {Array<Object>} products Lista de productos enriquecidos.
 * @param {Array<Object>} reviews Lista total de reseñas.
 * @returns {Object} Objeto con métricas calculadas con JS nativo.
 */
export function calculateCatalogMetrics(products = [], reviews = []) {
    const totalProductos = products.length;

    const disponiblesSV = products.filter(
        (p) => p.disponibilidadPais === "SV" || p.disponibilidadPais === "Ambos"
    ).length;

    const disponiblesGT = products.filter(
        (p) => p.disponibilidadPais === "GT" || p.disponibilidadPais === "Ambos"
    ).length;

    const enStock = products.filter((p) => p.stockEstado === "En Stock").length;
    const stockBajo = products.filter((p) => p.stockEstado === "Stock Bajo").length;
    const agotados = products.filter((p) => p.stockEstado === "Agotado").length;

    const sumUSD = products.reduce((acc, p) => acc + (Number(p.precioReferenciaUSD) || 0), 0);
    const sumGTQ = products.reduce((acc, p) => acc + (Number(p.precioReferenciaGTQ) || 0), 0);

    const precioPromedioUSD = totalProductos > 0 ? Number((sumUSD / totalProductos).toFixed(2)) : 0;
    const precioPromedioGTQ = totalProductos > 0 ? Number((sumGTQ / totalProductos).toFixed(2)) : 0;

    const sumRatings = reviews.reduce((acc, r) => acc + (Number(r.calificacion) || 0), 0);
    const calificacionGlobal =
        reviews.length > 0 ? Number((sumRatings / reviews.length).toFixed(2)) : 0;

    return {
        totalProductos,
        disponiblesSV,
        disponiblesGT,
        enStock,
        stockBajo,
        agotados,
        precioPromedioUSD,
        precioPromedioGTQ,
        totalResenas: reviews.length,
        calificacionGlobal
    };
}

/**
 * OPERACIÓN 3C: Calcula el costo estimado total y desglose de la Rutina de Skincare
 * armada por el cliente en Dólares (USD para El Salvador) y Quetzales (GTQ para Guatemala).
 * @param {Array<Object>} routineSteps Pasos de la rutina del usuario.
 * @param {Array<Object>} allProducts Catálogo de productos.
 * @returns {Object} Indicadores financieros y de horario de la rutina.
 */
export function calculateRoutineTotals(routineSteps = [], allProducts = []) {
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    let totalUSD = 0;
    let totalGTQ = 0;
    let pasosDia = 0;
    let pasosNoche = 0;

    const detailedSteps = routineSteps
        .map((step) => {
            const product = productMap.get(step.productoId);
            if (!product) return null;

            const usd = Number(product.precioReferenciaUSD) || 0;
            const gtq = Number(product.precioReferenciaGTQ) || 0;

            totalUSD += usd;
            totalGTQ += gtq;

            if (step.horario === "Día" || step.horario === "Día y Noche") pasosDia += 1;
            if (step.horario === "Noche" || step.horario === "Día y Noche") pasosNoche += 1;

            return {
                ...step,
                producto: product
            };
        })
        .filter(Boolean);

    return {
        detailedSteps,
        totalPasos: detailedSteps.length,
        pasosDia,
        pasosNoche,
        totalUSD: Number(totalUSD.toFixed(2)),
        totalGTQ: Number(totalGTQ.toFixed(2))
    };
}

