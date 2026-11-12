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
 *    y reemplaza los valores en `DEFAULT_FIREBASE_CONFIG` abajo.
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. Configuración oficial del proyecto Firebase
const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "bioaqua-sv-gt.firebaseapp.com",
    projectId: "bioaqua-sv-gt",
    storageBucket: "bioaqua-sv-gt.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000"
};

const STORAGE_CONFIG_KEY = "bioaqua_custom_firebase_config";

/**
 * Obtiene la configuración activa (permite inyectar llaves desde la UI en vivo
 * durante la defensa técnica o directamente en DEFAULT_FIREBASE_CONFIG).
 */
export function getActiveFirebaseConfig() {
    try {
        const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.apiKey && parsed.projectId) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn("No se pudo leer configuración personalizada de Firebase:", error);
    }
    return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Verifica si las credenciales de Firebase ya fueron configuradas con llaves reales.
 * @returns {boolean} true si hay llaves reales de Firebase configuradas.
 */
export function isFirebaseConfigured() {
    const cfg = getActiveFirebaseConfig();
    return Boolean(
        cfg &&
        cfg.apiKey &&
        cfg.apiKey !== "TU_API_KEY_AQUI" &&
        !cfg.apiKey.includes("TU_API_KEY") &&
        cfg.projectId &&
        cfg.projectId !== "bioaqua-sv-gt"
    );
}

/**
 * Guarda credenciales de Firebase desde la interfaz sin necesidad de tocar código
 * y recarga la aplicación para conectar con Cloud Firestore y Firebase Auth.
 * @param {Object} newConfig Objeto firebaseConfig con apiKey, authDomain, projectId, etc.
 */
export function saveCustomFirebaseConfig(newConfig) {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
}

/**
 * Restablece la configuración de Firebase para volver al modo local de respaldo.
 */
export function clearCustomFirebaseConfig() {
    localStorage.removeItem(STORAGE_CONFIG_KEY);
}

// Inicialización segura de instancias de Firebase
export const firebaseConfig = getActiveFirebaseConfig();

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.info("✅ Firebase BaaS conectado exitosamente al proyecto:", firebaseConfig.projectId);
    } catch (error) {
        console.error("❌ Error al inicializar Firebase:", error);
    }
} else {
    console.info(
        "ℹ️ Modo Respaldo Local Activo: Coloca tus llaves en js/config/firebaseConfig.js o mediante el botón 'Configurar Firebase' en la barra superior."
    );
}

export { app, auth, db };

