/**
 * ============================================================================
 * ARCHIVO: js/services/routineService.js
 * RESPONSABILIDAD: Operaciones remotas con Firestore para las entidades
 * secundarias relacionadas a `productos` y `users`:
 * 1. `rutinas`: Armador de Rutina Personalizada de Skincare por usuario (Día/Noche).
 * 2. `resenas`: Valoraciones (1-5 estrellas) y reseñas de clientes SV/GT.
 * ============================================================================
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db, isFirebaseConfigured } from "../config/firebaseConfig.js";
import { INITIAL_REVIEWS_SEED, INITIAL_ROUTINES_SEED } from "./seed.js";

const ROUTINES_COLLECTION = "rutinas";
const REVIEWS_COLLECTION = "resenas";

const LOCAL_ROUTINES_KEY = "bioaqua_local_rutinas";
const LOCAL_REVIEWS_KEY = "bioaqua_local_resenas";

// ============================================================================
// HELPERS DE ALMACENAMIENTO LOCAL (MODO RESPALDO)
// ============================================================================

function getLocalRoutinesStore() {
    try {
        const raw = localStorage.getItem(LOCAL_ROUTINES_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(INITIAL_ROUTINES_SEED));
            return JSON.parse(JSON.stringify(INITIAL_ROUTINES_SEED));
        }
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error leyendo rutinas locales:", err);
        return JSON.parse(JSON.stringify(INITIAL_ROUTINES_SEED));
    }
}

function saveLocalRoutinesStore(routines) {
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(routines));
}

function getLocalReviewsStore() {
    try {
        const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS_SEED));
            return JSON.parse(JSON.stringify(INITIAL_REVIEWS_SEED));
        }
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error leyendo reseñas locales:", err);
        return JSON.parse(JSON.stringify(INITIAL_REVIEWS_SEED));
    }
}

function saveLocalReviewsStore(reviews) {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews));
}

// ============================================================================
// GESTIÓN DE RUTINAS PERSONALIZADAS DE SKINCARE (`rutinas`)
// ============================================================================

/**
 * Obtiene la rutina personalizada del usuario autenticado (`uid`).
 * @param {string} uid UID del cliente.
 * @returns {Promise<Object>} Documento de rutina `{ uid, nombreRutina, pasos: [] }`.
 */
export async function getUserRoutine(uid) {
    if (!uid) {
        return { uid: null, nombreRutina: "Mi Rutina Bioaqua", pasos: [] };
    }

    try {
        if (isFirebaseConfigured() && db) {
            const docRef = doc(db, ROUTINES_COLLECTION, uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() };
            }
            // Si aún no tiene rutina creada en Firestore, inicializar estructura vacía
            const emptyRoutine = {
                uid,
                nombreRutina: "Mi Ritual Bioaqua",
                pasos: [],
                actualizadoEn: new Date().toISOString()
            };
            return emptyRoutine;
        }

        // Modo Respaldo Local
        await new Promise((r) => setTimeout(r, 150));
        const routines = getLocalRoutinesStore();
        const found = routines.find((r) => r.uid === uid);
        if (found) return found;

        return {
            id: `rutina-${uid}`,
            uid,
            nombreRutina: "Mi Ritual Bioaqua",
            pasos: [],
            actualizadoEn: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error en getUserRoutine:", error);
        throw new Error("No se pudo cargar tu rutina personalizada.");
    }
}

/**
 * Agrega un producto como paso a la rutina del cliente o actualiza el paso si ya estaba.
 * @param {string} uid UID del cliente.
 * @param {Object} stepData ({ productoId, horario, notas, nombreRutina })
 * @returns {Promise<Object>} Rutina actualizada.
 */
export async function addOrUpdateRoutineStep(uid, { productoId, horario, notas, nombreRutina }) {
    try {
        const currentRoutine = await getUserRoutine(uid);
        const pasos = Array.isArray(currentRoutine.pasos) ? [...currentRoutine.pasos] : [];

        const existingIndex = pasos.findIndex((p) => p.productoId === productoId);
        const stepObj = {
            pasoId: existingIndex >= 0 ? pasos[existingIndex].pasoId : `step-${Date.now()}`,
            productoId,
            horario: horario || "Día y Noche",
            notas: (notas || "").trim(),
            agregadoEn: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            pasos[existingIndex] = stepObj;
        } else {
            pasos.push(stepObj);
        }

        const updatedRoutine = {
            uid,
            nombreRutina: (nombreRutina || currentRoutine.nombreRutina || "Mi Ritual Bioaqua").trim(),
            pasos,
            actualizadoEn: new Date().toISOString()
        };

        if (isFirebaseConfigured() && db) {
            await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
                ...updatedRoutine,
                updatedAt: serverTimestamp()
            });
            return updatedRoutine;
        }

        await new Promise((r) => setTimeout(r, 200));
        const routines = getLocalRoutinesStore();
        const idx = routines.findIndex((r) => r.uid === uid);
        if (idx >= 0) {
            routines[idx] = updatedRoutine;
        } else {
            routines.push(updatedRoutine);
        }
        saveLocalRoutinesStore(routines);
        return updatedRoutine;
    } catch (error) {
        console.error("Error en addOrUpdateRoutineStep:", error);
        throw new Error("No se pudo guardar el producto en tu rutina Bioaqua.");
    }
}

/**
 * Actualiza el título personalizado de la rutina del usuario.
 * @param {string} uid UID del usuario.
 * @param {string} nuevoNombre Nuevo nombre para la rutina.
 * @returns {Promise<Object>}
 */
export async function updateRoutineTitle(uid, nuevoNombre) {
    try {
        const currentRoutine = await getUserRoutine(uid);
        const updatedRoutine = {
            ...currentRoutine,
            uid,
            nombreRutina: (nuevoNombre || "Mi Ritual Bioaqua").trim(),
            actualizadoEn: new Date().toISOString()
        };

        if (isFirebaseConfigured() && db) {
            await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
                ...updatedRoutine,
                updatedAt: serverTimestamp()
            });
            return updatedRoutine;
        }

        await new Promise((r) => setTimeout(r, 150));
        const routines = getLocalRoutinesStore();
        const idx = routines.findIndex((r) => r.uid === uid);
        if (idx >= 0) {
            routines[idx] = updatedRoutine;
        } else {
            routines.push(updatedRoutine);
        }
        saveLocalRoutinesStore(routines);
        return updatedRoutine;
    } catch (error) {
        console.error("Error en updateRoutineTitle:", error);
        throw new Error("No se pudo actualizar el nombre de tu rutina.");
    }
}

/**
 * Elimina un producto/paso específico de la rutina del usuario.
 * @param {string} uid UID del cliente.
 * @param {string} productoId ID del producto a quitar.
 * @returns {Promise<Object>} Rutina actualizada.
 */
export async function removeStepFromRoutine(uid, productoId) {
    try {
        const currentRoutine = await getUserRoutine(uid);
        const filteredSteps = (currentRoutine.pasos || []).filter(
            (p) => p.productoId !== productoId && p.pasoId !== productoId
        );

        const updatedRoutine = {
            ...currentRoutine,
            uid,
            pasos: filteredSteps,
            actualizadoEn: new Date().toISOString()
        };

        if (isFirebaseConfigured() && db) {
            await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
                ...updatedRoutine,
                updatedAt: serverTimestamp()
            });
            return updatedRoutine;
        }

        await new Promise((r) => setTimeout(r, 180));
        const routines = getLocalRoutinesStore();
        const idx = routines.findIndex((r) => r.uid === uid);
        if (idx >= 0) {
            routines[idx] = updatedRoutine;
            saveLocalRoutinesStore(routines);
        }
        return updatedRoutine;
    } catch (error) {
        console.error("Error en removeStepFromRoutine:", error);
        throw new Error("No se pudo quitar el producto de tu rutina.");
    }
}

// ============================================================================
// GESTIÓN DE RESEÑAS Y VALORACIONES DE CLIENTES (`resenas`)
// ============================================================================

/**
 * Obtiene todas las reseñas de productos desde Firestore (o LocalStorage).
 * @returns {Promise<Array<Object>>}
 */
export async function getAllReviews() {
    try {
        if (isFirebaseConfigured() && db) {
            const snap = await getDocs(collection(db, REVIEWS_COLLECTION));
            if (snap.empty) {
                await seedReviewsAndRoutines();
                const retrySnap = await getDocs(collection(db, REVIEWS_COLLECTION));
                return retrySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            }
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        await new Promise((r) => setTimeout(r, 140));
        return getLocalReviewsStore();
    } catch (error) {
        console.error("Error en getAllReviews:", error);
        return getLocalReviewsStore();
    }
}

/**
 * Publica una nueva reseña y calificación (1 a 5 estrellas) sobre un producto Bioaqua.
 * @param {Object} reviewData ({ productoId, uid, nombreUsuario, pais, calificacion, comentario })
 * @returns {Promise<Object>} Reseña creada.
 */
export async function createReview({ productoId, uid, nombreUsuario, pais, calificacion, comentario }) {
    try {
        const payload = {
            productoId,
            uid,
            nombreUsuario: nombreUsuario || "Cliente Bioaqua",
            pais: pais || "El Salvador",
            calificacion: Number(calificacion),
            comentario: comentario.trim(),
            fecha: new Date().toISOString()
        };

        if (isFirebaseConfigured() && db) {
            const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
                ...payload,
                createdAt: serverTimestamp()
            });
            return { id: docRef.id, ...payload };
        }

        await new Promise((r) => setTimeout(r, 240));
        const reviews = getLocalReviewsStore();
        const newReview = {
            id: `rev-${Date.now()}`,
            ...payload
        };
        reviews.unshift(newReview);
        saveLocalReviewsStore(reviews);
        return newReview;
    } catch (error) {
        console.error("Error en createReview:", error);
        throw new Error("No se pudo publicar tu reseña en este momento.");
    }
}

/**
 * Elimina una reseña (permitido al autor de la reseña o al administrador).
 * @param {string} reviewId ID de la reseña.
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId) {
    try {
        if (isFirebaseConfigured() && db) {
            await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
            return;
        }

        await new Promise((r) => setTimeout(r, 180));
        const reviews = getLocalReviewsStore();
        saveLocalReviewsStore(reviews.filter((r) => r.id !== reviewId));
    } catch (error) {
        console.error("Error en deleteReview:", error);
        throw new Error("No se pudo eliminar la reseña.");
    }
}

/**
 * Carga las reseñas y rutinas iniciales en Firestore o LocalStorage.
 */
export async function seedReviewsAndRoutines() {
    try {
        if (isFirebaseConfigured() && db) {
            for (const rev of INITIAL_REVIEWS_SEED) {
                const { id, ...data } = rev;
                await setDoc(doc(db, REVIEWS_COLLECTION, id), data);
            }
            for (const rut of INITIAL_ROUTINES_SEED) {
                await setDoc(doc(db, ROUTINES_COLLECTION, rut.uid), rut);
            }
            return;
        }

        saveLocalReviewsStore(INITIAL_REVIEWS_SEED);
        saveLocalRoutinesStore(INITIAL_ROUTINES_SEED);
    } catch (error) {
        console.error("Error en seedReviewsAndRoutines:", error);
    }
}

