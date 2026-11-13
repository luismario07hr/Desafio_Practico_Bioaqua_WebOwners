// js/config/firebaseConfig.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importamos el archivo generado por el script de Vercel (o el que creaste manual)
import { firebaseEnv } from './firebase.env.js';

const LOCAL_STORAGE_KEY = 'bioaqua_custom_firebase_config';

// 1. Obtener la configuración activa (Prioriza la guardada en el navegador, si no, usa la de Vercel)
export function getActiveFirebaseConfig() {
    const customConfigStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (customConfigStr) {
        try {
            return JSON.parse(customConfigStr);
        } catch (e) {
            console.error("Error al leer la configuración personalizada de Firebase", e);
        }
    }
    return firebaseEnv; // Retorna la configuración de producción
}

// 2. Verificar si hay configuración válida
export function isFirebaseConfigured() {
    const config = getActiveFirebaseConfig();
    return !!(config && config.apiKey && config.projectId);
}

// 3. Guardar configuración personalizada (desde el modal)
export function saveCustomFirebaseConfig(newConfig) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
    // Recargamos la página para que Firebase se inicialice con la nueva configuración
    window.location.reload();
}

// 4. Limpiar configuración personalizada (volver a la de Vercel)
export function clearCustomFirebaseConfig() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.reload();
}

// ==========================================
// INICIALIZACIÓN DE FIREBASE
// ==========================================
let app = null;
let auth = null;
let db = null;

const activeConfig = getActiveFirebaseConfig();

if (isFirebaseConfigured()) {
    try {
        // Evitamos inicializar la app dos veces si ya existe
        if (getApps().length === 0) {
            app = initializeApp(activeConfig);
        } else {
            app = getApps()[0];
        }
        auth = getAuth(app);
        db = getFirestore(app);
        console.info("✅ Firebase conectado al proyecto:", activeConfig.projectId);
    } catch (error) {
        console.error("❌ Error al inicializar Firebase:", error);
    }
} else {
    console.warn("⚠️ Firebase no está configurado. Faltan credenciales.");
}

export { app, auth, db };