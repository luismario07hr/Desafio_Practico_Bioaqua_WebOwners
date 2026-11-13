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
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración inyectada exclusivamente por variables de entorno en Vercel
import { firebaseEnv } from "./firebase.env.js";

const app = getApps().length === 0 ? initializeApp(firebaseEnv) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
