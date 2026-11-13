/**
 * ============================================================================
 * ARCHIVO: js/config/firebaseConfig.js
 * RESPONSABILIDAD: Configuración e inicialización de Firebase (BaaS).
 * ============================================================================
 * INSTRUCCIONES PARA CONECTAR TU PROYECTO FIREBASE:
 * 1. Ve a https://console.firebase.google.com/
 * 2. Crea o selecciona tu proyecto "Bioaqua SV-GT".
 * 3. Habilita "Authentication" (Proveedor: Correo electrónico/contraseña).
 * 4. Habilita "Cloud Firestore" y publica las reglas de `firestore.rules`.
 * 5. En Configuración del proyecto > Tus apps (Web), copia tu `firebaseConfig`
 *    y reemplaza los valores en `firebaseConfig` abajo.
 * ============================================================================
 */
// js/config/firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importamos el archivo generado por el script de Vercel
import { firebaseEnv } from './firebase.env.js';

const firebaseConfig = { ...firebaseEnv };

let app = null;
let auth = null;
let db = null;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.info("✅ Firebase conectado al proyecto:", firebaseConfig.projectId);
} catch (error) {
    console.error("❌ Error al inicializar Firebase:", error);
}

export { app, auth, db };