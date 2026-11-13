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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración oficial del proyecto Firebase
// ⚠️ No subas este archivo con credenciales reales al repositorio público.
// Usa variables de entorno o un archivo .env si tu hosting lo permite.
const firebaseConfig = {
  apiKey: "AIzaSyBIaaNab2OWLtPncWNF_wtmb5idYXQOoTw",
  authDomain: "bioaqua-sv-gt.firebaseapp.com",
  projectId: "bioaqua-sv-gt",
  storageBucket: "bioaqua-sv-gt.firebasestorage.app",
  messagingSenderId: "781577000466",
  appId: "1:781577000466:web:2c9df4ca695966fd3aeacb"
};

// Inicialización de Firebase
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