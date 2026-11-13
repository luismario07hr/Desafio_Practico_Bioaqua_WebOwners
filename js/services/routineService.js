/**
 * ============================================================================
 * ARCHIVO: js/services/routineService.js
 * RESPONSABILIDAD: Operaciones remotas con Cloud Firestore para:
 * - `resenas`: Valoraciones (1-5 estrellas) y reseñas de clientes sobre productos.
 * ============================================================================
 */

import {
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../config/firebaseConfig.js";
import { INITIAL_REVIEWS_SEED } from "./seed.js";

const REVIEWS_COLLECTION = "resenas";

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
        const snap = await getDocs(collection(db, REVIEWS_COLLECTION));

        if (snap.empty) {
            await seedReviewsAndRoutines();
            const retrySnap = await getDocs(collection(db, REVIEWS_COLLECTION));
            return retrySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error en getAllReviews:", error);
        throw new Error("No se pudieron cargar las reseñas desde Firestore.");
    }
}

/**
 * Publica una nueva reseña sobre un producto en Firestore.
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

        const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), {
            ...payload,
            createdAt: serverTimestamp()
        });

        return { id: docRef.id, ...payload };
    } catch (error) {
        console.error("Error en createReview:", error);
        throw new Error("No se pudo publicar tu reseña en Firestore.");
    }
}

/**
 * Elimina una reseña en Firestore. Permitido al autor o al administrador.
 * @param {string} reviewId ID de la reseña.
 * @returns {Promise<void>}
 */
export async function deleteReview(reviewId) {
    try {
        await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    } catch (error) {
        console.error("Error en deleteReview:", error);
        throw new Error("No se pudo eliminar la reseña en Firestore.");
    }
}

/**
 * Carga las reseñas iniciales en Firestore (seed).
 * Usa IDs fijos para evitar duplicados en cada ejecución.
 * @returns {Promise<void>}
 */
export async function seedReviewsAndRoutines() {
    try {
        for (const rev of INITIAL_REVIEWS_SEED) {
            const { id, ...data } = rev;
            await setDoc(doc(db, REVIEWS_COLLECTION, id), data);
        }
    } catch (error) {
        console.error("Error en seedReviewsAndRoutines:", error);
        throw new Error("Error al cargar los datos iniciales en Firestore.");
    }
}
