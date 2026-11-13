# Plataforma de Catálogo Interactivo y Asesoría Skincare — Bioaqua El Salvador & Guatemala

Aplicación web desarrollada para la asignatura **Desarrollo Web I (Desafío Práctico II)** en la **Escuela Superior de Economía y Negocios (ESEN)** utilizando **HTML5 semántico**, **CSS3**, **JavaScript Nativo (ES Modules)** y **Firebase (Authentication + Cloud Firestore)**.

---

## 1. Descripción del Problema y Procesos Implementados

**Bioaqua France (Distribución Oficial en El Salvador y Guatemala)** requería transformar su sitio informativo y catálogo estático en una plataforma interactiva de catálogo regional y asesoría de cuidado facial (*skincare*) adaptada al clima tropical centroamericano.

La aplicación resuelve este problema mediante **dos procesos funcionales interconectados** con control de acceso basado en dos roles (`admin` y `cliente`):

### Proceso 1: Administración de Catálogo Regional Bioaqua (`rol: "admin"`)
- **CRUD Completo de Productos (`productos`):** Creación, consulta, actualización y eliminación de productos desde el panel de administración.
- **Gestión Regional y de Inventario:** Control de disponibilidad por país (`SV`, `GT` o `Ambos`), precios de referencia en Dólares (`$ USD`) y Quetzales (`Q GTQ`), estado de stock (`En Stock`, `Stock Bajo`, `Agotado`) y marcación de productos destacados (*Best Sellers*).
- **Carga de Datos Iniciales (`Seed`):** Permite poblar o restaurar el catálogo inicial representativo de Bioaqua junto con reseñas y rutinas de prueba.

### Proceso 2: Armador de Rutina Personalizada y Valoraciones (`rol: "cliente"`)
- **Exploración y Filtrado del Catálogo:** Búsqueda y filtrado multicriterio según tipo de piel (*Grasa, Seca, Mixta, Sensible, Todas*), categoría, línea Bioaqua, país de disponibilidad y estado de stock.
- **Armador Interactivo "Mi Rutina Bioaqua" (`rutinas`):** Los clientes autenticados agregan o quitan productos de su rutina personal, asignan el horario de aplicación (**Día**, **Noche** o **Día y Noche**), registran notas personales de uso y visualizan el **cálculo automático del presupuesto estimado de su rutina en USD y Quetzales**.
- **Reseñas y Calificaciones (`resenas`):** Los usuarios autenticados publican o eliminan sus reseñas verificadas (1 a 5 estrellas), actualizando dinámicamente la calificación promedio de cada producto y los indicadores globales.

---

## 2. Tecnologías Utilizadas

- **Interfaz y Estructura:** HTML5 semántico y accesible (`index.html`, `productos.html`, `tipo-de-piel.html`, `sobre-nosotros.html`, `contacto.html`, `login.html`, `registro.html`).
- **Estilos y Diseño Adaptable:** CSS3 propio con diseño *Mobile-First*, variables CSS globales, Flexbox y CSS Grid.
- **Lógica de Cliente:** JavaScript Nativo (Vanilla JS) organizado mediante **ES Modules (`import` / `export`)**, manejo asíncrono con `async/await` y `try/catch`.
- **Autenticación y Persistencia Remota (BaaS):**
  - **Firebase Authentication:** Registro de usuarios (`rol: "cliente"` asignado obligatoriamente por defecto), inicio de sesión y cierre de sesión.
  - **Cloud Firestore:** Persistencia remota en 4 colecciones relacionadas (`users`, `productos`, `rutinas`, `resenas`) protegidas mediante reglas de seguridad (`firestore.rules`).
- **Despliegue:** Vercel (con inyección de variables de entorno mediante `scripts/generate-env.js`).

---

## 3. Estructura Modular del Proyecto

```text
Desafio_Practico_Bioaqua_WebOwners/
├── index.html                  # Página de inicio, ritual de 8 pasos y puntos de venta
├── productos.html              # Catálogo 100% dinámico, KPIs, Panel Admin y Mi Rutina
├── tipo-de-piel.html           # Guía interactiva por tipo de piel conectada al catálogo
├── sobre-nosotros.html         # Información institucional de Bioaqua
├── contacto.html               # Formulario de contacto regional con validación JS
├── login.html                  # Página de inicio de sesión
├── registro.html               # Página de registro de cuenta (asigna rol 'cliente')
├── firestore.rules             # Reglas de seguridad de Cloud Firestore por rol y propietario
├── package.json                # Script de construcción para entorno de despliegue
├── vercel.json                 # Configuración de despliegue en Vercel
├── scripts/
│   └── generate-env.js         # Generador de js/config/firebase.env.js desde variables de entorno
├── css/
│   ├── styles.css              # Variables globales, reset, header y footer responsive
│   ├── productosStyle.css      # Estilos base de tarjetas de productos y Best Sellers
│   ├── appBioaqua.css          # Estilos de componentes dinámicos, KPIs, filtros, toasts y skeletons
│   ├── authStyle.css           # Estilos de las páginas login.html y registro.html
│   ├── indexStyle.css          # Estilos de la página de inicio
│   ├── pielStyle.css           # Estilos de la guía de tipo de piel
│   ├── sobrenosotrosStyle.css  # Estilos de la sección sobre nosotros
│   └── contactoStyle.css       # Estilos de la página de contacto
└── js/
    ├── main.js                 # Punto de entrada principal de la aplicación
    ├── config/
    │   └── firebaseConfig.js   # Inicialización de Firebase App, Auth y Firestore
    ├── services/
    │   ├── authService.js      # Registro, Login, Logout, observador de sesión y colección 'users'
    │   ├── productService.js   # Operaciones CRUD remotas de la colección 'productos'
    │   ├── routineService.js   # Operaciones remotas de las colecciones 'rutinas' y 'resenas'
    │   └── seed.js             # Conjunto de datos iniciales representativos de Bioaqua
    ├── ui/
    │   ├── navbarUI.js         # Sincronización del estado de sesión y rol en el Navbar
    │   ├── auth-pages.js       # Controlador, validaciones y redirección de login.html y registro.html
    │   ├── catalogUI.js        # Renderizado dinámico del catálogo, filtros, ordenamiento y KPIs
    │   ├── adminUI.js          # Panel y modal CRUD exclusivo para el rol 'admin'
    │   ├── clientRoutineUI.js  # Armador de rutina personalizada y modal de reseñas
    │   └── notificationsUI.js  # Estados de carga (skeletons/spinners), toasts y estados vacíos
    └── utils/
        ├── validators.js       # Validaciones de formularios y reglas de negocio en JS
        └── dataProcessor.js    # Filtrado multicriterio, ordenamiento y cálculo de indicadores
```

---

## 4. Modelo de Datos en Cloud Firestore (4 Colecciones)

1. **`users`** *(Perfiles y Roles)*:
   - `uid` *(string)*, `nombre` *(string)*, `email` *(string)*, `pais` *(`"El Salvador"` | `"Guatemala"`)*, `tipoPiel` *(`"Grasa"` | `"Seca"` | `"Mixta"` | `"Sensible"` | `"Todas"`)*, `rol` *(`"cliente"` | `"admin"`)*.
2. **`productos`** *(Entidad Principal con CRUD Completo)*:
   - `id`, `nombre`, `linea`, `categoria`, `tipoPielRecomendada`, `precioReferenciaUSD` *(number)*, `precioReferenciaGTQ` *(number)*, `disponibilidadPais` *(`"SV"` | `"GT"` | `"Ambos"`)*, `stockEstado` *(`"En Stock"` | `"Stock Bajo"` | `"Agotado"`)*, `descripcion`, `ingredientesClave`, `imagenUrl`, `destacado` *(boolean)*.
3. **`rutinas`** *(Entidad Secundaria — Rutina Personalizada por Usuario)*:
   - Documento por `uid`: `uid`, `nombreRutina`, `actualizadoEn`, `pasos` *(Array de objetos `{ pasoId, productoId, horario: "Día" | "Noche" | "Día y Noche", notas }`)*.
4. **`resenas`** *(Entidad Secundaria — Valoraciones de Productos)*:
   - `id`, `productoId`, `uid`, `nombreUsuario`, `pais`, `calificacion` *(number 1-5)*, `comentario`, `fecha`.

---

## 5. Operaciones de Procesamiento de Datos con JavaScript (`js/utils/dataProcessor.js`)

1. **Filtrado y Búsqueda Multicriterio (`filterProducts`):** Filtra en tiempo real combinando búsqueda por texto (nombre, ingrediente activo o descripción) con selectores de País (`SV`, `GT`, `Ambos`), Categoría, Tipo de Piel Recomendada, Línea Bioaqua y Estado de Stock.
2. **Ordenamiento Dinámico (`sortProducts`):** Ordena los productos por destacados, precio de referencia (menor a mayor o mayor a menor), calificación promedio (`★`) o alfabéticamente (`A-Z`).
3. **Agrupación y Cálculo de Indicadores (`calculateCatalogMetrics`, `calculateRoutineTotals`, `enrichProductsWithRatings`):** Calcula en el cliente el total de productos activos por país, desglose de stock, calificación promedio por producto a partir de sus reseñas, precio promedio regional y el costo estimado total de la rutina personalizada en USD y Quetzales.

---

## 6. Instrucciones para Configurar y Probar la Solución

### Configuración Local
1. Clona el repositorio y abre la carpeta en **VS Code**.
2. Configura el archivo `js/config/firebase.env.js` (excluido en `.gitignore` por seguridad) con la configuración de tu proyecto de Firebase:
   ```javascript
   export const firebaseEnv = {
       apiKey: "TU_API_KEY",
       authDomain: "TU_PROYECTO.firebaseapp.com",
       projectId: "TU_PROYECTO",
       storageBucket: "TU_PROYECTO.appspot.com",
       messagingSenderId: "TU_SENDER_ID",
       appId: "TU_APP_ID"
   };
   ```
3. Publica las reglas de seguridad contenidas en `firestore.rules` dentro de **Firestore Database → Reglas** en la consola de Firebase.
4. Ejecuta el proyecto con un servidor local (por ejemplo, clic derecho en `index.html` → **"Open with Live Server"**).

### Pruebas de la Aplicación por Rol
- **Credenciales de Prueba (`admin` y `cliente`):** Conforme al numeral 17 de la guía del Desafío Práctico II, las credenciales de prueba para ambos roles se proporcionan en la entrega de **Moodle** (sin publicar contraseñas en el repositorio).
- **Registro Público (`registro.html`):** Al registrar una cuenta nueva, el sistema valida todos los campos en el cliente, crea el usuario en Firebase Authentication y guarda su perfil en la colección `users` con `rol: "cliente"`, redirigiéndolo automáticamente a su sección **"Mi Rutina Bioaqua"** en `productos.html`.
- **Inicio y Cierre de Sesión (`login.html` y Navbar):** El botón **"Iniciar Sesión / Registrarse"** en el menú de navegación permite autenticarse; al iniciar sesión, redirige según el rol (`admin` → `productos.html#panel-admin`; `cliente` → `productos.html#mi-rutina-section`) y muestra en el Navbar el nombre del usuario, su etiqueta de rol y el botón **"Cerrar Sesión"**.
- **Flujo Rol `cliente` (`productos.html`):** Permite filtrar y ordenar el catálogo, agregar o quitar productos de su rutina de Día/Noche, visualizar el cálculo de presupuesto en USD/GTQ y publicar reseñas.
- **Flujo Rol `admin` (`productos.html#panel-admin`):** Habilita el panel superior de administración regional para crear nuevos productos, editar precios/stock/disponibilidad, eliminar productos o restaurar los datos iniciales (`Seed`).

