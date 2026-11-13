/**
 * ============================================================================
 * ARCHIVO: js/services/routineService.js
 * RESPONSABILIDAD: Operaciones remotas con Firestore para las entidades
 * secundarias relacionadas a `productos` y `users`:
 * 1. `rutinas`: Armador de Rutina Personalizada de Skincare por usuario.
 * 2. `resenas`: Valoraciones (1-5 estrellas) y reseñas de clientes.
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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../config/firebaseConfig.js";
import { INITIAL_REVIEWS_SEED, INITIAL_ROUTINES_SEED } from "./seed.js";

const ROUTINES_COLLECTION = "rutinas";
const REVIEWS_COLLECTION  = "resenas";

const LOCAL_ROUTINES_KEY = "bioaqua_local_rutinas";
const LOCAL_REVIEWS_KEY  = "bioaqua_local_resenas";

function getLocalRoutines() {
    try {
        const raw = localStorage.getItem(LOCAL_ROUTINES_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(INITIAL_ROUTINES_SEED));
            return JSON.parse(JSON.stringify(INITIAL_ROUTINES_SEED));
        }
        return JSON.parse(raw);
    } catch {
        return JSON.parse(JSON.stringify(INITIAL_ROUTINES_SEED));
    }
}

function saveLocalRoutines(list) {
    localStorage.setItem(LOCAL_ROUTINES_KEY, JSON.stringify(list));
}

function getLocalReviews() {
    try {
        const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS_SEED));
            return JSON.parse(JSON.stringify(INITIAL_REVIEWS_SEED));
        }
        return JSON.parse(raw);
    } catch {
        return JSON.parse(JSON.stringify(INITIAL_REVIEWS_SEED));
    }
}

function saveLocalReviews(list) {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(list));
}

// ============================================================================
// GESTIÓN DE RUTINAS PERSONALIZADAS (`rutinas`)
// ============================================================================

/**
 * Obtiene la rutina personalizada del usuario autenticado.
 * Si no existe en Firestore, retorna una estructura vacía sin crearla todavía.
 * @param {string} uid UID del cliente.
 * @returns {Promise<Object>} Documento de rutina { uid, nombreRutina, pasos: [] }
 */
export async function getUserRoutine(uid) {
    if (!uid) {
        return { uid: null, nombreRutina: "Mi Rutina Bioaqua", pasos: [] };
    }

    try {
        if (!db) {
            const found = getLocalRoutines().find((r) => r.uid === uid);
            return (
                found || {
                    uid,
                    nombreRutina: "Mi Ritual Bioaqua",
                    pasos: [],
                    actualizadoEn: new Date().toISOString()
                }
            );
        }

        const docRef = doc(db, ROUTINES_COLLECTION, uid);
        const snap   = await getDoc(docRef);

        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }

        // Sin documento en Firestore: retornar estructura vacía (no se guarda hasta que el usuario agregue algo)
        return {
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
 * Agrega un producto como paso a la rutina del cliente, o actualiza el paso si ya existía.
 * @param {string} uid UID del cliente.
 * @param {Object} stepData { productoId, horario, notas, nombreRutina }
 * @returns {Promise<Object>} Rutina actualizada.
 */
export async function addOrUpdateRoutineStep(uid, { productoId, horario, notas, nombreRutina }) {
    try {
        const currentRoutine = await getUserRoutine(uid);
        const pasos          = Array.isArray(currentRoutine.pasos) ? [...currentRoutine.pasos] : [];

        const existingIndex = pasos.findIndex((p) => p.productoId === productoId);
        const stepObj = {
            pasoId:     existingIndex >= 0 ? pasos[existingIndex].pasoId : `step-${Date.now()}`,
            productoId,
            horario:    horario || "Día y Noche",
            notas:      (notas || "").trim(),
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

        if (!db) {
            const list = getLocalRoutines();
            const idx = list.findIndex((r) => r.uid === uid);
            if (idx >= 0) list[idx] = updatedRoutine;
            else list.push(updatedRoutine);
            saveLocalRoutines(list);
            return updatedRoutine;
        }

        await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
            ...updatedRoutine,
            updatedAt: serverTimestamp()
        });

        return updatedRoutine;
    } catch (error) {
        console.error("Error en addOrUpdateRoutineStep:", error);
        throw new Error("No se pudo guardar el producto en tu rutina.");
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

        if (!db) {
            const list = getLocalRoutines();
            const idx = list.findIndex((r) => r.uid === uid);
            if (idx >= 0) list[idx] = updatedRoutine;
            else list.push(updatedRoutine);
            saveLocalRoutines(list);
            return updatedRoutine;
        }

        await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
            ...updatedRoutine,
            updatedAt: serverTimestamp()
        });

        return updatedRoutine;
    } catch (error) {
        console.error("Error en updateRoutineTitle:", error);
        throw new Error("No se pudo actualizar el nombre de tu rutina.");
    }
}

/**
 * Elimina un paso específico de la rutina del usuario.
 * @param {string} uid UID del cliente.
 * @param {string} productoId ID del producto a quitar.
 * @returns {Promise<Object>} Rutina actualizada.
 */
export async function removeStepFromRoutine(uid, productoId) {
    try {
        const currentRoutine = await getUserRoutine(uid);
        const filteredSteps  = (currentRoutine.pasos || []).filter(
            (p) => p.productoId !== productoId && p.pasoId !== productoId
        );

        const updatedRoutine = {
            ...currentRoutine,
            uid,
            pasos:         filteredSteps,
            actualizadoEn: new Date().toISOString()
        };

        if (!db) {
            const list = getLocalRoutines();
            const idx = list.findIndex((r) => r.uid === uid);
            if (idx >= 0) list[idx] = updatedRoutine;
            saveLocalRoutines(list);
            return updatedRoutine;
        }

        await setDoc(doc(db, ROUTINES_COLLECTION, uid), {
            ...updatedRoutine,
            updatedAt: serverTimestamp()
        });

        return updatedRoutine;
    } catch (error) {
        console.error("Error en removeStepFromRoutine:", error);
        throw new Error("No se pudo quitar el producto de tu rutina.");
    }
}

// ============================================================================
// GESTIÓN DE RESEÑAS Y VALORACIONES (`resenas`)
// ============================================================================

/**
 * Obtiene todas las reseñas desde Firestore.
 * Si la colección está vacía, ejecuta el seed inicial.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllReviews() {
    try {
        if (!db) {
            return getLocalReviews();
        }

        const snap = await getDocs(collection(db, REVIEWS_COLLECTION));

        if (snap.empty) {
            await seedReviewsAndRoutines();
            const retrySnap = await getDocs(collection(db, REVIEWS_COLLECTION));
            return retrySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error en getAllReviews:", error);
        throw new Error("No se pudieron cargar las reseñas.");
    }
}

/**
 * Publica una nueva reseña sobre un producto.
 * @param {Object} reviewData { productoId, uid, nombreUsuario, pais, calificacion, comentario }
 * @returns {Promise<Object>} Reseña creada.
 */
export async function createReview({ productoId, uid, nombreUsuario, pais, calificacion, comentario }) {
    try {
        const payload = {
            productoId,
            uid,
            nombreUsuario: nombreUsuario || "Cliente Bioaqua",
            pais:          pais || "El Salvador",
            calificacion:  Number(calificacion),
            comentario:    comentario.trim(),
            fecha:         new Date().toISOString()
        };

        if (!db) {
            const list = getLocalReviews();
            const created = { id: `rev-${Date.now()}`, ...payload };
            list.unshift(created);
            saveLocalReviews(list);
            return created;
        }

        const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
            ...payload,
            createdAt: serverTimestamp()
        });

        return { id: docRef.id, ...payload };
    } catch (error) {
        console.error("Error en createReview:", error);
        throw new Error("No se pudo publicar tu reseña.");
    }
}

/**
 * Elimina una reseña. Permitido al autor o al administrador
 * (la restricción real la aplican las Firestore Rules).
 * @param {string} reviewId ID de la reseña.
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId) {
    try {
        if (!db) {
            saveLocalReviews(getLocalReviews().filter((r) => r.id !== reviewId));
            return;
        }
        await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    } catch (error) {
        console.error("Error en deleteReview:", error);
        throw new Error("No se pudo eliminar la reseña.");
    }
}

/**
 * Carga reseñas y rutinas iniciales en Firestore (seed).
 * Usa IDs fijos para evitar duplicados en cada ejecución.
 * @returns {Promise<void>}
 */
export async function seedReviewsAndRoutines() {
    try {
        if (!db) {
            saveLocalReviews(INITIAL_REVIEWS_SEED);
            saveLocalRoutines(INITIAL_ROUTINES_SEED);
            return;
        }

        for (const rev of INITIAL_REVIEWS_SEED) {
            const { id, ...data } = rev;
            await setDoc(doc(db, REVIEWS_COLLECTION, id), data);
        }
        for (const rut of INITIAL_ROUTINES_SEED) {
            await setDoc(doc(db, ROUTINES_COLLECTION, rut.uid), rut);
        }
    } catch (error) {
        console.error("Error en seedReviewsAndRoutines:", error);
        throw new Error("Error al cargar los datos iniciales.");
    }
}

/**
 * Obtiene todas las rutinas registradas en Firestore (Exclusivo Administrador).
 * En modo local, retorna las rutinas guardadas en localStorage.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllRoutines() {
    try {
        if (!db) {
            return getLocalRoutines();
        }
        const snap = await getDocs(collection(db, ROUTINES_COLLECTION));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error al obtener rutinas:", error);
        return [];
    }
}
