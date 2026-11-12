/**
 * ============================================================================
 * ARCHIVO: js/services/authService.js
 * RESPONSABILIDAD: Lógica de Autenticación con Firebase Auth y gestión de
 * perfiles y roles ('admin' y 'cliente') en la colección 'users' de Firestore.
 * Incluye respaldo local automático cuando no se han ingresado llaves de Firebase.
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

import { auth, db, isFirebaseConfigured } from "../config/firebaseConfig.js";

// Claves para persistencia en modo respaldo local (cuando aún no hay llaves Firebase)
const LOCAL_USERS_KEY = "bioaqua_local_users";
const LOCAL_SESSION_KEY = "bioaqua_local_session_uid";

// Cuentas preconfiguradas para prueba inmediata en Modo Respaldo Local
const DEFAULT_LOCAL_USERS = [
    {
        uid: "admin-bioaqua-sv-gt",
        nombre: "Admin Regional Bioaqua",
        email: "admin@bioaqua.com",
        passwordHash: "admin123",
        pais: "El Salvador",
        tipoPiel: "Mixta",
        rol: "admin",
        fechaRegistro: "2026-01-15T10:00:00.000Z"
    },
    {
        uid: "cliente-demo-sv",
        nombre: "Camila Hernández",
        email: "cliente@bioaqua.com",
        passwordHash: "cliente123",
        pais: "El Salvador",
        tipoPiel: "Mixta",
        rol: "cliente",
        fechaRegistro: "2026-02-10T14:30:00.000Z"
    },
    {
        uid: "cliente-demo-gt",
        nombre: "Sofía Morales",
        email: "sofia.gt@bioaqua.com",
        passwordHash: "cliente123",
        pais: "Guatemala",
        tipoPiel: "Seca",
        rol: "cliente",
        fechaRegistro: "2026-02-18T09:15:00.000Z"
    }
];

// Lista de suscriptores al estado de sesión
const authListeners = new Set();
let currentUserProfile = null;

/**
 * Inicializa usuarios locales por defecto si no existen.
 */
function getLocalUsers() {
    try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_LOCAL_USERS));
            return [...DEFAULT_LOCAL_USERS];
        }
        return JSON.parse(raw);
    } catch (error) {
        console.error("Error al leer usuarios locales:", error);
        return [...DEFAULT_LOCAL_USERS];
    }
}

function saveLocalUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

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
 * Registra un nuevo usuario en Firebase Auth y crea su documento en la colección `users`.
 * NOTA CRÍTICA DE NEGOCIO: El registro público SIEMPRE asigna `rol: "cliente"` por defecto.
 *
 * @param {Object} userData Datos del nuevo usuario ({ nombre, email, password, pais, tipoPiel }).
 * @returns {Promise<Object>} Perfil completo del usuario registrado.
 */
export async function registerUser({ nombre, email, password, pais, tipoPiel }) {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanNombre = nombre.trim();

        // 1. MODO FIREBASE BaaS REAL
        if (isFirebaseConfigured() && auth && db) {
            const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const firebaseUser = credential.user;

            await updateProfile(firebaseUser, { displayName: cleanNombre });

            // Documento en colección 'users' con rol 'cliente' por defecto
            const userDocData = {
                uid: firebaseUser.uid,
                nombre: cleanNombre,
                email: cleanEmail,
                pais,
                tipoPiel,
                rol: "cliente",
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, "users", firebaseUser.uid), userDocData);

            const profile = { ...userDocData, createdAt: new Date().toISOString() };
            notifyAuthListeners(profile);
            return profile;
        }

        // 2. MODO RESPALDO LOCAL (cuando aún no se han colocado las llaves de Firebase)
        await new Promise((r) => setTimeout(r, 350)); // Simulación de latencia asíncrona
        const users = getLocalUsers();
        const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
        if (exists) {
            const err = new Error("Este correo electrónico ya está registrado.");
            err.code = "auth/email-already-in-use";
            throw err;
        }

        const newProfile = {
            uid: `user-${Date.now()}`,
            nombre: cleanNombre,
            email: cleanEmail,
            passwordHash: password,
            pais,
            tipoPiel,
            rol: "cliente", // SIEMPRE 'cliente' en registro público
            fechaRegistro: new Date().toISOString()
        };

        users.push(newProfile);
        saveLocalUsers(users);
        localStorage.setItem(LOCAL_SESSION_KEY, newProfile.uid);

        const safeProfile = { ...newProfile };
        delete safeProfile.passwordHash;
        notifyAuthListeners(safeProfile);
        return safeProfile;
    } catch (error) {
        console.error("Error en registerUser:", error);
        throw translateAuthError(error);
    }
}

/**
 * Inicia sesión con correo y contraseña en Firebase Auth y recupera el perfil y rol desde `users`.
 * @param {Object} credentials ({ email, password })
 * @returns {Promise<Object>} Perfil del usuario autenticado incluyendo su `rol`.
 */
export async function loginUser({ email, password }) {
    try {
        const cleanEmail = email.trim().toLowerCase();

        // 1. MODO FIREBASE BaaS REAL
        if (isFirebaseConfigured() && auth && db) {
            const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            const firebaseUser = credential.user;

            const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            let profile;

            if (userSnap.exists()) {
                profile = { uid: firebaseUser.uid, ...userSnap.data() };
            } else {
                // Si el usuario fue creado desde Firebase Console sin documento en 'users'
                profile = {
                    uid: firebaseUser.uid,
                    nombre: firebaseUser.displayName || cleanEmail.split("@")[0],
                    email: cleanEmail,
                    pais: "El Salvador",
                    tipoPiel: "Mixta",
                    rol: cleanEmail.startsWith("admin") ? "admin" : "cliente"
                };
                await setDoc(doc(db, "users", firebaseUser.uid), profile);
            }

            notifyAuthListeners(profile);
            return profile;
        }

        // 2. MODO RESPALDO LOCAL
        await new Promise((r) => setTimeout(r, 300));
        const users = getLocalUsers();
        const found = users.find(
            (u) => u.email.toLowerCase() === cleanEmail && u.passwordHash === password
        );

        if (!found) {
            const err = new Error("Credenciales incorrectas.");
            err.code = "auth/invalid-credential";
            throw err;
        }

        localStorage.setItem(LOCAL_SESSION_KEY, found.uid);
        const safeProfile = { ...found };
        delete safeProfile.passwordHash;
        notifyAuthListeners(safeProfile);
        return safeProfile;
    } catch (error) {
        console.error("Error en loginUser:", error);
        throw translateAuthError(error);
    }
}

/**
 * Cierra la sesión activa del usuario en Firebase Auth o en el almacenamiento local.
 * @returns {Promise<void>}
 */
export async function logoutUser() {
    try {
        if (isFirebaseConfigured() && auth) {
            await signOut(auth);
        } else {
            await new Promise((r) => setTimeout(r, 150));
            localStorage.removeItem(LOCAL_SESSION_KEY);
        }
        notifyAuthListeners(null);
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        throw new Error("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
}

/**
 * Permite actualizar el perfil o alternar el rol durante pruebas de defensa técnica
 * (por ejemplo, probar vista Admin vs Cliente rápidamente).
 * @param {string} uid UID del usuario.
 * @param {Object} updates Campos a actualizar ({ rol, pais, tipoPiel }).
 * @returns {Promise<Object>} Perfil actualizado.
 */
export async function updateUserProfileData(uid, updates) {
    try {
        if (isFirebaseConfigured() && db) {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, updates);
            const snap = await getDoc(userRef);
            const updated = { uid, ...snap.data() };
            notifyAuthListeners(updated);
            return updated;
        }

        const users = getLocalUsers();
        const idx = users.findIndex((u) => u.uid === uid);
        if (idx === -1) throw new Error("Usuario no encontrado.");

        users[idx] = { ...users[idx], ...updates };
        saveLocalUsers(users);

        const safeProfile = { ...users[idx] };
        delete safeProfile.passwordHash;
        notifyAuthListeners(safeProfile);
        return safeProfile;
    } catch (error) {
        console.error("Error al actualizar perfil de usuario:", error);
        throw new Error("No se pudo actualizar el perfil del usuario.");
    }
}

/**
 * Suscribe un callback a los cambios de estado de autenticación.
 * @param {Function} callback Función que recibe `userProfile` (o `null` si es visitante).
 * @returns {Function} Función para cancelar la suscripción.
 */
export function subscribeToAuthChanges(callback) {
    authListeners.add(callback);

    if (isFirebaseConfigured() && auth && db) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                notifyAuthListeners(null);
                return;
            }
            try {
                const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
                if (userSnap.exists()) {
                    notifyAuthListeners({ uid: firebaseUser.uid, ...userSnap.data() });
                } else {
                    const fallbackProfile = {
                        uid: firebaseUser.uid,
                        nombre: firebaseUser.displayName || firebaseUser.email.split("@")[0],
                        email: firebaseUser.email,
                        pais: "El Salvador",
                        tipoPiel: "Mixta",
                        rol: firebaseUser.email.startsWith("admin") ? "admin" : "cliente"
                    };
                    await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile);
                    notifyAuthListeners(fallbackProfile);
                }
            } catch (err) {
                console.error("Error obteniendo perfil de Firestore:", err);
                notifyAuthListeners({
                    uid: firebaseUser.uid,
                    nombre: firebaseUser.displayName || firebaseUser.email,
                    email: firebaseUser.email,
                    pais: "El Salvador",
                    tipoPiel: "Mixta",
                    rol: "cliente"
                });
            }
        });
        return () => {
            authListeners.delete(callback);
            unsubscribe();
        };
    } else {
        // Modo respaldo local
        const activeUid = localStorage.getItem(LOCAL_SESSION_KEY);
        if (activeUid) {
            const users = getLocalUsers();
            const found = users.find((u) => u.uid === activeUid);
            if (found) {
                const safeProfile = { ...found };
                delete safeProfile.passwordHash;
                currentUserProfile = safeProfile;
                callback(safeProfile);
            } else {
                currentUserProfile = null;
                callback(null);
            }
        } else {
            currentUserProfile = null;
            callback(null);
        }

        return () => authListeners.delete(callback);
    }
}

/**
 * Devuelve sincrónicamente el perfil del usuario actualmente en memoria.
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentUserProfile;
}

/**
 * Traduce códigos de error de Firebase Auth a mensajes claros en español.
 * @param {Error} error Error original.
 * @returns {Error} Error con mensaje amigable.
 */
function translateAuthError(error) {
    const code = error.code || "";
    const map = {
        "auth/email-already-in-use": "Este correo electrónico ya está registrado en Bioaqua. Inicia sesión.",
        "auth/invalid-email": "El formato del correo electrónico no es válido.",
        "auth/weak-password": "La contraseña es muy débil. Usa al menos 6 caracteres.",
        "auth/user-not-found": "No existe una cuenta registrada con este correo electrónico.",
        "auth/wrong-password": "La contraseña ingresada es incorrecta.",
        "auth/invalid-credential": "Correo o contraseña incorrectos. Verifica tus datos.",
        "auth/too-many-requests": "Demasiados intentos fallidos. Espera un momento antes de reintentar."
    };
    return new Error(map[code] || error.message || "Ocurrió un error de autenticación.");
}

