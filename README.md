# Plataforma de Catálogo Interactivo y Asesoría Skincare — Bioaqua El Salvador & Guatemala

Aplicación web modular desarrollada con **HTML5 semántico**, **CSS3** y **JavaScript Nativo (ES Modules)** integrada con **Firebase (Authentication + Cloud Firestore)** para el **Desafío Práctico II**.

---

## 1. Descripción del Problema y Contexto de Negocio

**Bioaqua France (Distribución Oficial El Salvador 🇸🇻 y Guatemala 🇬🇹)** requería evolucionar su sitio web informativo y catálogo estático hacia una **plataforma interactiva de catálogo regional y asesoría de cuidado facial (skincare)** adaptada al clima tropical centroamericano, sin convertirse en una pasarela de pagos transaccional.

La solución implementada resuelve dos procesos funcionales interconectados bajo control de acceso por roles:

1. **Proceso 1 — Administración de Catálogo Regional Bioaqua (`rol: "admin"`):**
   - Gestión **CRUD completa** en tiempo real sobre la colección principal `productos`.
   - Control de disponibilidad regional por país (**El Salvador `SV`**, **Guatemala `GT`** o **`Ambos`**), precios de referencia duales en **Dólares (`$ USD`)** y **Quetzales (`Q GTQ`)**, estado de inventario (`En Stock`, `Stock Bajo`, `Agotado`) y productos destacados (*Best Sellers*).
   - Visualización de métricas e indicadores del catálogo y herramienta de carga inicial (**Seed**) con 13 productos reales de Bioaqua.

2. **Proceso 2 — Armador de Rutina Personalizada de Skincare y Reseñas (`rol: "cliente"`):**
   - Exploración dinámica del catálogo según el país activo (**SV / GT**) y el perfil cutáneo del usuario (*Grasa, Seca, Mixta, Sensible, Todas*).
   - **Armador interactivo "Mi Rutina Bioaqua" (`rutinas`):** Permite al cliente agregar o quitar productos, clasificar cada paso por horario (**Día ☀️**, **Noche 🌙** o **Día y Noche ☀️🌙**), registrar notas personales de aplicación y calcular automáticamente el **presupuesto estimado total de su rutina en USD y Quetzales**.
   - **Sistema de Reseñas y Valoraciones (`resenas`):** Publicación y gestión de reseñas verificadas con calificación de **1 a 5 estrellas (★)** que recalculan en vivo el promedio de cada producto y los indicadores globales.

---

## 2. Arquitectura Modular del Proyecto (ES Modules)

El código JavaScript está organizado estrictamente mediante **ES Modules (`import` / `export`)** con separación de responsabilidades:

```text
Desafio_Practico_Bioaqua_WebOwners/
├── index.html                  # Landing page + Ritual de 8 pasos + Sucursales SV
├── productos.html              # Plataforma de Catálogo 100% Dinámico, Panel Admin y Mi Rutina
├── tipo-de-piel.html           # Guía por perfil cutáneo conectada con filtros del catálogo
├── sobre-nosotros.html         # Historia, misión y visión regional
├── contacto.html               # Contacto regional SV/GT con validación JS
├── firestore.rules             # Reglas de seguridad de Cloud Firestore por rol y propietario
├── css/
│   ├── styles.css              # Variables de marca, layout global y menú responsive
│   ├── productosStyle.css      # Estilos base de tarjetas de catálogo y Best Sellers
│   ├── appBioaqua.css          # Estilos de componentes dinámicos (Modales, Auth, Admin, Rutina, KPIs, Toasts, Skeletons)
│   ├── indexStyle.css          # Estilos específicos de inicio
│   ├── pielStyle.css           # Estilos específicos de guía de piel
│   ├── sobrenosotrosStyle.css  # Estilos específicos de sobre nosotros
│   └── contactoStyle.css       # Estilos específicos de contacto
└── js/
    ├── main.js                 # Punto de entrada principal que inicializa módulos según la vista
    ├── config/
    │   └── firebaseConfig.js   # Inicialización de Firebase App, Auth y Firestore + gestor de credenciales
    ├── services/
    │   ├── authService.js      # Registro (rol 'cliente' por defecto), Login, Logout y colección 'users'
    │   ├── productService.js   # CRUD asíncrono completo de la colección 'productos'
    │   ├── routineService.js   # Operaciones de las colecciones 'rutinas' y 'resenas'
    │   └── seed.js             # Datos iniciales (13 productos reales Bioaqua SV/GT + reseñas + rutinas)
    ├── ui/
    │   ├── navbarUI.js         # Barra de sesión global, selector SV/GT y modales de Auth/Configuración
    │   ├── catalogUI.js        # Renderizado dinámico del catálogo, filtros, ordenamiento e indicadores KPI
    │   ├── adminUI.js          # Panel y Modal CRUD exclusivo para rol 'admin'
    │   ├── clientRoutineUI.js  # Armador de Rutina Día/Noche y Modal de Reseñas para rol 'cliente'
    │   └── notificationsUI.js  # Toasts flotantes, Spinners/Skeletons de carga y Empty States
    └── utils/
        ├── validators.js       # Validaciones personalizadas JS para todos los formularios
        └── dataProcessor.js    # Funciones puras de filtrado multicriterio, ordenamiento y cálculo de KPIs
```

---

## 3. Modelo de Datos en Cloud Firestore (4 Colecciones)

1. **`users`** *(Perfiles y Roles)*:
   - `uid` *(string)*, `nombre` *(string)*, `email` *(string)*, `pais` *(`"El Salvador"` | `"Guatemala"`)*, `tipoPiel` *(`"Grasa"` | `"Seca"` | `"Mixta"` | `"Sensible"` | `"Todas"`)*, `rol` *(`"cliente"` | `"admin"`)*.
2. **`productos`** *(Entidad Principal con CRUD Completo)*:
   - `id`, `nombre`, `linea`, `categoria`, `tipoPielRecomendada`, `precioReferenciaUSD` *(number)*, `precioReferenciaGTQ` *(number)*, `disponibilidadPais` *(`"SV"` | `"GT"` | `"Ambos"`)*, `stockEstado` *(`"En Stock"` | `"Stock Bajo"` | `"Agotado"`)*, `descripcion`, `ingredientesClave`, `imagenUrl`, `destacado` *(boolean)*.
3. **`rutinas`** *(Entidad Secundaria — Rutina Personalizada por Usuario)*:
   - Documento por `uid`: `uid`, `nombreRutina`, `actualizadoEn`, `pasos` *(Array de objetos `{ pasoId, productoId, horario: "Día" | "Noche" | "Día y Noche", notas }`)*.
4. **`resenas`** *(Entidad Secundaria — Valoraciones de Productos)*:
   - `id`, `productoId`, `uid`, `nombreUsuario`, `pais`, `calificacion` *(number 1-5)*, `comentario`, `fecha`.

---

## 4. Procesamiento de Datos con JavaScript Nativo (`js/utils/dataProcessor.js`)

1. **Filtrado y Búsqueda Multicriterio en Tiempo Real (`filterProducts`):**
   - Filtra simultáneamente por coincidencia textual en `nombre`, `ingredientesClave`, `descripcion` y `linea`, combinado con selectores de **País de disponibilidad (`SV`, `GT`, `Exclusivo-SV`, `Exclusivo-GT`)**, **Categoría**, **Tipo de Piel Recomendada**, **Línea Bioaqua** y **Estado de Stock**.
2. **Ordenamiento Dinámico Multi-moneda (`sortProducts`):**
   - Ordena por **Destacados/Best Sellers**, **Precio de Referencia (Menor a Mayor / Mayor a Menor)** adaptándose automáticamente a USD (`$`) o Quetzales (`Q`) según el país activo, **Calificación Promedio (`★`)** o **Alfabéticamente (`A-Z`)**.
3. **Cálculo de Indicadores / KPIs (`calculateCatalogMetrics`, `calculateRoutineTotals`, `enrichProductsWithRatings`):**
   - Calcula el total de productos activos por país (SV vs GT), desglose de inventario, precio promedio regional en ambas monedas, calificación promedio por producto y global, y el **costo total estimado de la rutina del cliente en USD y GTQ**.

---

## 5. Instrucciones de Ejecución, Configuración de Firebase y Pruebas

### Ejecución Local
Dado que el proyecto utiliza **ES Modules (`<script type="module">`)**, debes abrirlo mediante un servidor HTTP local (por ejemplo, la extensión **Live Server** de VS Code):
1. Abre la carpeta del proyecto en **VS Code**.
2. Haz clic derecho sobre `productos.html` o `index.html` y selecciona **"Open with Live Server"** (o ejecuta `npx serve .` / `python -m http.server 5500`).

### Conexión con tu Proyecto de Firebase (y Modo Demo Inmediato)
El proyecto incluye un sistema dual pensado para facilitar tanto el desarrollo como la defensa técnica:
- **Opción A (En código):** Abre [`js/config/firebaseConfig.js`](js/config/firebaseConfig.js) y reemplaza el objeto `DEFAULT_FIREBASE_CONFIG` con las credenciales de tu proyecto Firebase.
- **Opción B (En vivo desde la interfaz):** Haz clic en el botón **"Modo Demo / Llaves"** ubicado en el encabezado superior de cualquier página y pega tu `apiKey`, `projectId`, `authDomain` y `appId`.
- **Respaldo Automático:** Si aún no has colocado las llaves de Firebase, la aplicación funciona al 100% en **Modo Emulación Local Persistente**, permitiendo probar de inmediato los roles `admin` y `cliente`, el CRUD de productos, el botón `Seed`, el armador de rutinas y las reseñas con botones de **Acceso Rápido en 1 clic** dentro del modal de Inicio de Sesión.

