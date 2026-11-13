/**
 * ============================================================================
 * ARCHIVO: js/services/seed.js
 * RESPONSABILIDAD: Datos iniciales realistas (Catálogo Bioaqua El Salvador
 * y Guatemala, Reseñas iniciales y Rutina de muestra) para carga inmediata.
 * ============================================================================
 */

export const INITIAL_PRODUCTS_SEED = [
    {
        id: "bio-suero-hialuronico",
        nombre: "Suero de Ácido Hialurónico Water Get",
        linea: "Ácido Hialurónico",
        categoria: "Sérum",
        tipoPielRecomendada: "Seca",
        precioReferenciaUSD: 8.50,
        precioReferenciaGTQ: 65.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Hidrata en profundidad las capas epidérmicas, aporta elasticidad inmediata y reduce la apariencia de líneas finas causadas por la deshidratación en climas cálidos.",
        ingredientesClave: "Ácido Hialurónico de bajo peso molecular, Glicerina botánica, Alantoína",
        imagenUrl: "img/suero-acido-hialuronico-clean.png",
        destacado: true
    },
    {
        id: "bio-protector-solar-spf50",
        nombre: "Bloqueador Solar Refresh & Moisture SPF 50+",
        linea: "Solar & Defensa UV",
        categoria: "Protección Solar",
        tipoPielRecomendada: "Todas",
        precioReferenciaUSD: 9.95,
        precioReferenciaGTQ: 78.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Escudo diario de amplio espectro SPF 50+ PA+++ contra rayos UVA/UVB. Textura ultraligera, acabado invisible sin rastro blanco y resistente a la humedad tropical.",
        ingredientesClave: "Filtros UV de amplio espectro, Extracto de Aloe Vera, Vitamina E, Bisabolol",
        imagenUrl: "img/protector-facial-clean.png",
        destacado: true
    },
    {
        id: "bio-crema-perlas-puras",
        nombre: "Crema Aclarante de Perlas Puras",
        linea: "Perlas Puras",
        categoria: "Crema",
        tipoPielRecomendada: "Mixta",
        precioReferenciaUSD: 10.50,
        precioReferenciaGTQ: 82.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Aclara progresivamente manchas solares, unifica el tono facial y aporta luminosidad natural gracias a su textura sedosa enriquecida con polvo de perla hidrolizada.",
        ingredientesClave: "Perla Hidrolizada, Niacinamida (Vitamina B3), Ácido Hialurónico",
        imagenUrl: "img/crema-aclarante-perlas-puras-clean.png",
        destacado: true
    },
    {
        id: "bio-desmaquillante-bifasico",
        nombre: "Desmaquillante Bifásico Ojos y Rostro",
        linea: "Ácido Hialurónico",
        categoria: "Limpiador",
        tipoPielRecomendada: "Sensible",
        precioReferenciaUSD: 7.75,
        precioReferenciaGTQ: 60.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Fórmula bifásica gentil que disuelve maquillaje a prueba de agua, protector solar y partículas contaminantes sin frotar ni irritar el contorno de ojos.",
        ingredientesClave: "Agua Micelar Purificada, Extracto de Manzanilla, Pantenol (Pro-Vitamina B5)",
        imagenUrl: "img/desmaquillante-bifasico-clean.png",
        destacado: false
    },
    {
        id: "bio-gel-exfoliante-arroz",
        nombre: "Gel Exfoliante de Arroz Rice Raw Pulp",
        linea: "Arroz (Rice Raw Pulp)",
        categoria: "Exfoliante",
        tipoPielRecomendada: "Mixta",
        precioReferenciaUSD: 6.95,
        precioReferenciaGTQ: 54.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Elimina células muertas con suavidad, desobstruye los poros y renueva la superficie cutánea dejándola suave, luminosa y lista para absorber activos.",
        ingredientesClave: "Extracto Fermentado de Arroz, Ácido Láctico Suave, Extracto de Cítricos",
        imagenUrl: "img/gel-exfoliante-arroz-clean.png",
        destacado: false
    },
    {
        id: "bio-espuma-limpiadora-pure",
        nombre: "Crema Espuma Limpiadora Pure Skin",
        linea: "Pure Skin (Anti-Acné)",
        categoria: "Limpiador",
        tipoPielRecomendada: "Grasa",
        precioReferenciaUSD: 6.50,
        precioReferenciaGTQ: 50.00,
        disponibilidadPais: "SV",
        stockEstado: "En Stock",
        descripcion: "Limpieza profunda de espuma cremosa que regula el exceso de sebo, purifica poros dilatados y respeta la barrera cutánea sin sensación de tirantez.",
        ingredientesClave: "Ácido Salicílico (BHA), Extracto de Árbol de Té, Centella Asiática",
        imagenUrl: "img/crema-limpiadora-pure-skin.png",
        destacado: false
    },
    {
        id: "bio-proteina-seda",
        nombre: "Crema Reparadora de Proteína de Seda",
        linea: "Proteína de Seda",
        categoria: "Crema",
        tipoPielRecomendada: "Seca",
        precioReferenciaUSD: 9.25,
        precioReferenciaGTQ: 72.00,
        disponibilidadPais: "Ambos",
        stockEstado: "Stock Bajo",
        descripcion: "Fortalece la barrera hidrolipídica, suaviza asperezas y devuelve una sensación de piel tersa, firme y confortable frente al calor centroamericano.",
        ingredientesClave: "Fibroína de Seda Hidrolizada, Ceramidas NP, Escualano Vegetal",
        imagenUrl: "img/proteina-de-seda-clean.png", // ✅ corregido: eliminado espacio en nombre de archivo
        destacado: false
    },
    {
        id: "bio-crema-focalizada-acne",
        nombre: "Crema Focalizada Anti-Acné Pure Skin",
        linea: "Pure Skin (Anti-Acné)",
        categoria: "Crema",
        tipoPielRecomendada: "Grasa",
        precioReferenciaUSD: 7.50,
        precioReferenciaGTQ: 58.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Tratamiento intensivo localizado que calma la inflamación de brotes activos, controla el brillo de la zona T y previene marcas post-acné.",
        ingredientesClave: "Centella Asiática, Niacinamida 4%, Extracto de Hamamelis, Pca de Zinc",
        imagenUrl: "img/crema-focalizada-anti-acne-clean.png",
        destacado: false
    },
    {
        id: "bio-serum-vitamina-c",
        nombre: "Sérum Iluminador Vitamina C + Ácido Hialurónico",
        linea: "Vitamina C",
        categoria: "Sérum",
        tipoPielRecomendada: "Todas",
        precioReferenciaUSD: 9.50,
        precioReferenciaGTQ: 74.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Potente antioxidante diario que combate el aspecto apagado, atenúa manchas de hiperpigmentación y estimula la luminosidad natural del rostro.",
        ingredientesClave: "Vitamina C Estabilizada (3-O-Ethyl Ascorbic Acid), Ácido Hialurónico, Extracto de Naranja Dulce",
        imagenUrl: "img/serum-vitamina-c-ah-clean.png",
        destacado: true
    },
    {
        id: "bio-suero-pure-skin",
        nombre: "Suero Equilibrante Anti-Acné Pure Skin",
        linea: "Pure Skin (Anti-Acné)",
        categoria: "Sérum",
        tipoPielRecomendada: "Grasa",
        precioReferenciaUSD: 8.75,
        precioReferenciaGTQ: 68.00,
        disponibilidadPais: "GT",
        stockEstado: "En Stock",
        descripcion: "Fórmula fluida seborreguladora que afina la textura de los poros, difumina marcas residuales y mantiene el rostro mate y fresco todo el día.",
        ingredientesClave: "Niacinamida, Extracto de Centella Asiática, Ácido Salicílico Encapsulado",
        imagenUrl: "img/suero-aclarante-anti-acne-clean.png",
        destacado: false
    },
    {
        id: "bio-crema-arroz-pulp",
        nombre: "Crema Facial Hidratante Rice Raw Pulp",
        linea: "Arroz (Rice Raw Pulp)",
        categoria: "Crema",
        tipoPielRecomendada: "Mixta",
        precioReferenciaUSD: 8.90,
        precioReferenciaGTQ: 69.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Nutrición ligera con pulpa de arroz blanco que suaviza la textura facial, equilibra la hidratación y devuelve el efecto porcelana a pieles con manchas.",
        ingredientesClave: "Agua de Salvado de Arroz, Inositol, Vitamina E, Escualano",
        imagenUrl: "img/piel/crema-arroz.png",
        destacado: false
    },
    {
        id: "bio-serum-pestanas",
        nombre: "Sérum Nutritivo Crecimiento de Pestañas",
        linea: "Retinol Antiedad",
        categoria: "Cuidado Localizado",
        tipoPielRecomendada: "Todas",
        precioReferenciaUSD: 7.95,
        precioReferenciaGTQ: 62.00,
        disponibilidadPais: "SV",
        stockEstado: "Stock Bajo",
        descripcion: "Fortalece desde el folículo, nutre y estimula la densidad de pestañas y cejas para una mirada más definida y resistente al desmaquillado.",
        ingredientesClave: "Péptidos Biotina-GHK, Pantenol, Extracto de Raíz de Ginseng",
        imagenUrl: "img/suero-crecimiento-pestanas-clean.png",
        destacado: false
    },
    {
        id: "bio-shampoo-jengibre",
        nombre: "Ginger Essence Shampoo Fortalecedor",
        linea: "Botánica Capilar",
        categoria: "Cuidado Capilar",
        tipoPielRecomendada: "Todas",
        precioReferenciaUSD: 11.50,
        precioReferenciaGTQ: 89.00,
        disponibilidadPais: "Ambos",
        stockEstado: "En Stock",
        descripcion: "Ritual capilar estimulante con extracto puro de jengibre que revitaliza el cuero cabelludo, controla la grasa en la raíz y previene la caída por quiebre.",
        ingredientesClave: "Extracto de Rizoma de Jengibre, Proteína de Trigo, Aceite de Jojoba",
        imagenUrl: "img/ginger-sense-shampoo-clean.png",
        destacado: false
    }
];

export const INITIAL_REVIEWS_SEED = [
    {
        id: "rev-1",
        productoId: "bio-suero-hialuronico",
        uid: "cliente-demo-sv",
        nombreUsuario: "Camila Hernández",
        pais: "El Salvador",
        calificacion: 5,
        comentario: "Se absorbe rapidísimo sin dejar sensación pegajosa en el calor de San Salvador. Mi piel se siente súper hidratada antes del maquillaje.",
        fecha: "2026-10-15T14:20:00.000Z"
    },
    {
        id: "rev-2",
        productoId: "bio-protector-solar-spf50",
        uid: "cliente-demo-gt",
        nombreUsuario: "Sofía Morales",
        pais: "Guatemala",
        calificacion: 5,
        comentario: "¡El mejor bloqueador calidad-precio! No deja la cara blanca ni grasosa, ideal para usarlo todos los días en Ciudad de Guatemala.",
        fecha: "2026-10-19T09:40:00.000Z"
    },
    {
        id: "rev-3",
        productoId: "bio-crema-perlas-puras",
        uid: "cliente-demo-sv",
        nombreUsuario: "Valeria Rivas",
        pais: "El Salvador",
        calificacion: 4,
        comentario: "Llevo 3 semanas usándola en mi rutina de noche y me ha ayudado bastante a emparejar el tono en las mejillas.",
        fecha: "2026-10-25T18:10:00.000Z"
    },
    {
        id: "rev-4",
        productoId: "bio-serum-vitamina-c",
        uid: "cliente-demo-gt",
        nombreUsuario: "Sofía Morales",
        pais: "Guatemala",
        calificacion: 5,
        comentario: "Deja un glow precioso por las mañanas combinado con el protector solar de Bioaqua. Totalmente recomendado.",
        fecha: "2026-11-01T11:05:00.000Z"
    },
    {
        id: "rev-5",
        productoId: "bio-gel-exfoliante-arroz",
        uid: "cliente-demo-sv",
        nombreUsuario: "Camila Hernández",
        pais: "El Salvador",
        calificacion: 5,
        comentario: "Es súper gentil con la piel mixta. Lo uso dos veces por semana y deja los poros limpios y la piel suavecita.",
        fecha: "2026-11-04T16:30:00.000Z"
    },
    {
        id: "rev-6",
        productoId: "bio-crema-focalizada-acne",
        uid: "cliente-demo-sv",
        nombreUsuario: "Diego Méndez",
        pais: "El Salvador",
        calificacion: 4,
        comentario: "Desinflama los brotes en un par de noches sin resecar el resto de la cara. Muy buen producto.",
        fecha: "2026-11-07T20:15:00.000Z"
    }
];

export const INITIAL_ROUTINES_SEED = [
    {
        id: "rutina-cliente-demo-sv",
        uid: "cliente-demo-sv",
        nombreRutina: "Mi Ritual Equilibrio Tropical SV",
        actualizadoEn: "2026-11-08T12:00:00.000Z",
        pasos: [
            {
                pasoId: "step-101",
                productoId: "bio-desmaquillante-bifasico",
                horario: "Noche",
                notas: "Aplicar con algodón suave para retirar el protector solar del día."
            },
            {
                pasoId: "step-102",
                productoId: "bio-serum-vitamina-c",
                horario: "Día",
                notas: "3 gotas en rostro limpio cada mañana para dar luminosidad."
            },
            {
                pasoId: "step-103",
                productoId: "bio-suero-hialuronico",
                horario: "Día y Noche",
                notas: "Aplicar sobre piel ligeramente húmeda."
            },
            {
                pasoId: "step-104",
                productoId: "bio-protector-solar-spf50",
                horario: "Día",
                notas: "Dos dedos de producto como último paso de la mañana."
            }
        ]
    },
    {
        id: "rutina-cliente-demo-gt",
        uid: "cliente-demo-gt",
        nombreRutina: "Rutina Hidratación Profunda GT",
        actualizadoEn: "2026-11-09T15:30:00.000Z",
        pasos: [
            {
                pasoId: "step-201",
                productoId: "bio-suero-hialuronico",
                horario: "Día y Noche",
                notas: "Hidratación base antes de la crema."
            },
            {
                pasoId: "step-202",
                productoId: "bio-proteina-seda",
                horario: "Noche",
                notas: "Masaje ascendente en rostro y cuello antes de dormir."
            },
            {
                pasoId: "step-203",
                productoId: "bio-protector-solar-spf50",
                horario: "Día",
                notas: "Reaplicar al mediodía."
            }
        ]
    }
];

/**
 * Imágenes locales disponibles en el repositorio para facilitar la selección en el CRUD Admin.
 */
export const AVAILABLE_LOCAL_IMAGES = [
    { label: "Suero Ácido Hialurónico",     path: "img/suero-acido-hialuronico-clean.png" },
    { label: "Protector Solar SPF 50+",     path: "img/protector-facial-clean.png" },
    { label: "Crema Perlas Puras",          path: "img/crema-aclarante-perlas-puras-clean.png" },
    { label: "Desmaquillante Bifásico",     path: "img/desmaquillante-bifasico-clean.png" },
    { label: "Gel Exfoliante de Arroz",     path: "img/gel-exfoliante-arroz-clean.png" },
    { label: "Espuma Limpiadora Pure Skin", path: "img/crema-limpiadora-pure-skin.png" },
    { label: "Crema Proteína de Seda",      path: "img/proteina-de-seda-clean.png" }, // ✅ corregido
    { label: "Crema Focalizada Anti-Acné",  path: "img/crema-focalizada-anti-acne-clean.png" },
    { label: "Sérum Vitamina C + AH",       path: "img/serum-vitamina-c-ah-clean.png" },
    { label: "Suero Pure Skin Anti-Acné",   path: "img/suero-aclarante-anti-acne-clean.png" },
    { label: "Sérum de Pestañas",           path: "img/suero-crecimiento-pestanas-clean.png" },
    { label: "Shampoo Jengibre Capilar",    path: "img/ginger-sense-shampoo-clean.png" },
    { label: "Crema de Arroz Rice Raw Pulp",path: "img/piel/crema-arroz.png" },
    { label: "Set Anti-Acné Bioaqua",       path: "img/piel/set-acne.png" },
    { label: "Esencia Vitamina C",          path: "img/piel/vitaminaC.png" }
];