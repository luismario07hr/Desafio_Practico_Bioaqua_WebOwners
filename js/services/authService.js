/**
 * ============================================================================
 * ARCHIVO: js/services/authService.js
 * RESPONSABILIDAD: Lógica de autenticación con Firebase Auth y gestión de
 * perfiles y roles ('admin' y 'cliente') en la colección 'users' de Firestore.
 * ============================================================================
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db } from "../config/firebaseConfig.js";

// Claves de respaldo local cuando Firebase aún no tiene credenciales configuradas
const LOCAL_USERS_KEY = "bioaqua_local_users";
const LOCAL_SESSION_KEY = "bioaqua_local_session_uid";

// Perfil del usuario actualmente en sesión (en memoria)
let currentUserProfile = null;

// Lista de suscriptores al estado de sesión
const authListeners = new Set();

function getLocalUsers() {
    try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveLocalUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

/**
 * Notifica a todos los suscriptores sobre un cambio de sesión.
 * @param {Object|null} userProfile
 */
function notifyAuthListeners(userProfile) {
    currentUserProfile = userProfile;
    authListeners.forEach((callback) => {
        try {
            callback(userProfile);
        } catch (err) {
            console.error("Error en listener de autenticación:", err);
        }
    });
}

/**
 * Registra un nuevo usuario en Firebase Auth y crea su documento en 'users'.
 * REGLA DE NEGOCIO: El registro público SIEMPRE asigna rol: "cliente".
 * El rol "admin" solo puede asignarse manualmente desde la consola de Firebase.
 *
 * @param {Object} userData - { nombre, email, password, pais, tipoPiel }
 * @returns {Promise<Object>} Perfil completo del usuario registrado.
 */
export async function registerUser({ nombre, email, password, pais, tipoPiel }) {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanNombre = nombre.trim();

        if (auth && db) {
            const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const firebaseUser = credential.user;

            await updateProfile(firebaseUser, { displayName: cleanNombre });

            const userDocData = {
                uid: firebaseUser.uid,
                nombre: cleanNombre,
                email: cleanEmail,
                pais,
                tipoPiel,
                rol: "cliente", // SIEMPRE "cliente" en registro público
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, "users", firebaseUser.uid), userDocData);

            const profile = { ...userDocData, createdAt: new Date().toISOString() };
            notifyAuthListeners(profile);
            return profile;
        }

        // Respaldo local si aún no se han configurado credenciales en firebase.env.js
        await new Promise((r) => setTimeout(r, 350));
        const users = getLocalUsers();
        if (users.some((u) => u.email === cleanEmail)) {
            const dupError = new Error("Este correo ya está registrado.");
            dupError.code = "auth/email-already-in-use";
            throw dupError;
        }

        const localProfile = {
            uid: `user-${Date.now()}`,
            nombre: cleanNombre,
            email: cleanEmail,
            password,
            pais,
            tipoPiel,
            rol: "cliente",
            createdAt: new Date().toISOString()
        };
        users.push(localProfile);
        saveLocalUsers(users);
        localStorage.setItem(LOCAL_SESSION_KEY, localProfile.uid);

        const safeProfile = { ...localProfile };
        delete safeProfile.password;
        notifyAuthListeners(safeProfile);
        return safeProfile;

    } catch (error) {
        console.error("Error en registerUser:", error);
        throw translateAuthError(error);
    }
}

/**
 * Inicia sesión con correo y contraseña, y recupera el perfil con rol desde Firestore.
 *
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} Perfil del usuario autenticado incluyendo su rol.
 */
export async function loginUser({ email, password }) {
    try {
        const cleanEmail = email.trim().toLowerCase();

        if (auth && db) {
            const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const firebaseUser = credential.user;

            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

            if (!userSnap.exists()) {
                // Usuario creado en Firebase Console sin documento en 'users'
                // Se crea su documento con rol "cliente" por seguridad
                const fallbackProfile = {
                    uid: firebaseUser.uid,
                    nombre: firebaseUser.displayName || cleanEmail.split("@")[0],
                    email: cleanEmail,
                    pais: "El Salvador",
                    tipoPiel: "Mixta",
                    rol: "cliente"
                };
                await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile);
                notifyAuthListeners(fallbackProfile);
                return fallbackProfile;
            }

            const profile = { uid: firebaseUser.uid, ...userSnap.data() };
            notifyAuthListeners(profile);
            return profile;
        }

        // Respaldo local si aún no se han configurado credenciales en firebase.env.js
        await new Promise((r) => setTimeout(r, 300));
        const users = getLocalUsers();
        const found = users.find((u) => u.email === cleanEmail && u.password === password);
        if (!found) {
            const credErr = new Error("Credenciales inválidas.");
            credErr.code = "auth/invalid-credential";
            throw credErr;
        }
        localStorage.setItem(LOCAL_SESSION_KEY, found.uid);
        const safeProfile = { ...found };
        delete safeProfile.password;
        notifyAuthListeners(safeProfile);
        return safeProfile;

    } catch (error) {
        console.error("Error en loginUser:", error);
        throw translateAuthError(error);
    }
}

/**
 * Cierra la sesión activa del usuario en Firebase Auth.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    try {
        if (auth) {
            await signOut(auth);
        } else {
            localStorage.removeItem(LOCAL_SESSION_KEY);
        }
        notifyAuthListeners(null);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
}

/**
 * Actualiza campos del perfil de un usuario en Firestore.
 * IMPORTANTE: Esta función solo debe llamarse desde contextos de admin
 * o desde el propio usuario para campos permitidos (pais, tipoPiel).
 * El cambio de rol debe hacerse exclusivamente desde las Firestore Rules
 * o la consola de Firebase, nunca desde el cliente libremente.
 *
 * @param {string} uid - UID del usuario a actualizar.
 * @param {Object} updates - Campos a actualizar ({ pais, tipoPiel, nombre }).
 * @returns {Promise<Object>} Perfil actualizado.
 */
export async function updateUserProfileData(uid, updates) {
    try {
        // Prevenir que se cambie el rol desde el cliente
        const safeUpdates = { ...updates };
        delete safeUpdates.rol;

        if (db) {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, safeUpdates);

            const snap = await getDoc(userRef);
            const updated = { uid, ...snap.data() };
            notifyAuthListeners(updated);
            return updated;
        }

        const users = getLocalUsers();
        const idx = users.findIndex((u) => u.uid === uid);
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...safeUpdates };
            saveLocalUsers(users);
            const safeProfile = { ...users[idx] };
            delete safeProfile.password;
            notifyAuthListeners(safeProfile);
            return safeProfile;
        }
        return null;

    } catch (error) {
        console.error("Error al actualizar perfil:", error);
        throw new Error("No se pudo actualizar el perfil del usuario.");
    }
}

/**
 * Obtiene el perfil del usuario actualmente autenticado desde Firestore.
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUserProfile() {
    try {
        if (!auth) return currentUserProfile;
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return null;

        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!snap.exists()) return null;

        return { uid: firebaseUser.uid, ...snap.data() };
    } catch (error) {
        console.error("Error al obtener perfil:", error);
        return null;
    }
}

/**
 * Suscribe un callback a los cambios de estado de autenticación (Firebase onAuthStateChanged).
 * Se dispara automáticamente al cargar la página si hay sesión activa.
 *
 * @param {Function} callback - Recibe userProfile (Object) o null si no hay sesión.
 * @returns {Function} Función para cancelar la suscripción.
 */
export function subscribeToAuthChanges(callback) {
    authListeners.add(callback);

    // Si Firebase aún no tiene credenciales configuradas (auth === null), evitar error de SDK
    if (!auth || !db) {
        const savedUid = localStorage.getItem(LOCAL_SESSION_KEY);
        const users = getLocalUsers();
        const found = savedUid ? users.find((u) => u.uid === savedUid) : null;
        if (found) {
            const safeProfile = { ...found };
            delete safeProfile.password;
            currentUserProfile = safeProfile;
            callback(safeProfile);
        } else {
            currentUserProfile = null;
            callback(null);
        }
        return () => authListeners.delete(callback);
    }

    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
            notifyAuthListeners(null);
            return;
        }
        try {
            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

            if (userSnap.exists()) {
                notifyAuthListeners({ uid: firebaseUser.uid, ...userSnap.data() });
            } else {
                // Documento no existe: crear con rol "cliente" por seguridad
                const fallbackProfile = {
                    uid: firebaseUser.uid,
                    nombre: firebaseUser.displayName || firebaseUser.email.split("@")[0],
                    email: firebaseUser.email,
                    pais: "El Salvador",
                    tipoPiel: "Mixta",
                    rol: "cliente"
                };
                await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile);
                notifyAuthListeners(fallbackProfile);
            }
        } catch (err) {
            console.error("Error obteniendo perfil desde Firestore:", err);
            // En caso de error de red, usar datos básicos de Firebase Auth
            notifyAuthListeners({
                uid: firebaseUser.uid,
                nombre: firebaseUser.displayName || firebaseUser.email,
                email: firebaseUser.email,
                rol: "cliente" // rol mínimo por seguridad ante cualquier fallo
            });
        }
    });

    return () => {
        authListeners.delete(callback);
        unsubscribeFirebase();
    };
}

/**
 * Devuelve sincrónicamente el perfil del usuario actualmente en memoria.
 * Útil para verificaciones rápidas sin necesidad de await.
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentUserProfile;
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes en español.
 * @param {Error} error
 * @returns {Error}
 */
function translateAuthError(error) {
    const map = {
        "auth/email-already-in-use":   "Este correo ya está registrado en Bioaqua. Inicia sesión.",
        "auth/invalid-email":          "El formato del correo electrónico no es válido.",
        "auth/weak-password":          "La contraseña es muy débil. Usa al menos 6 caracteres.",
        "auth/user-not-found":         "No existe una cuenta registrada con este correo.",
        "auth/wrong-password":         "La contraseña ingresada es incorrecta.",
        "auth/invalid-credential":     "Correo o contraseña incorrectos. Verifica tus datos.",
        "auth/too-many-requests":      "Demasiados intentos fallidos. Espera un momento antes de reintentar.",
        "auth/network-request-failed": "Error de conexión de red. Verifica tu internet e intenta nuevamente."
    };
    const translated = new Error(map[error.code] || error.message || "Ocurrió un error de autenticación.");
    translated.code = error.code || "auth/unknown";
    return translated;
}
