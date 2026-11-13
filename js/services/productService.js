/**
 * ============================================================================
 * ARCHIVO: js/services/productService.js
 * RESPONSABILIDAD: Operaciones CRUD completas sobre la entidad principal
 * `productos` exclusivamente en Cloud Firestore.
 * ============================================================================
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../config/firebaseConfig.js";
import { INITIAL_PRODUCTS_SEED } from "./seed.js";

const COLLECTION_NAME = "productos";

/**
 * READ (Todos): Obtiene todos los documentos de la colección `productos` en Firestore.
 * Si la colección está vacía en el primer arranque, ejecuta el seed inicial.
 * @returns {Promise<Array<Object>>}
 */
export async function getAllProducts() {
    try {
        const snap = await getDocs(collection(db, COLLECTION_NAME));

        if (snap.empty) {
            await seedProductsToFirestore();
            const seededSnap = await getDocs(collection(db, COLLECTION_NAME));
            return seededSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
        console.error("Error en getAllProducts:", error);
        throw new Error("No se pudo cargar el catálogo de productos desde Firestore.");
    }
}

/**
 * READ (Uno): Obtiene un producto específico por su ID desde Firestore.
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
export async function getProductById(productId) {
    try {
        const snap = await getDoc(doc(db, COLLECTION_NAME, productId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
        console.error("Error en getProductById:", error);
        throw new Error("Error al consultar el detalle del producto en Firestore.");
    }
}

/**
 * CREATE: Crea un nuevo producto en Firestore. Exclusivo para rol 'admin'.
 * @param {Object} productData Datos validados del producto.
 * @returns {Promise<Object>} Producto creado con su ID asignado.
 */
export async function createProduct(productData) {
    try {
        const payload = {
            ...productData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
        return { id: docRef.id, ...productData };
    } catch (error) {
        console.error("Error en createProduct:", error);
        throw new Error("No se pudo registrar el producto. Verifica tus permisos de administrador en Firestore.");
    }
}

/**
 * UPDATE: Actualiza un producto existente en Firestore. Exclusivo para rol 'admin'.
 * @param {string} productId
 * @param {Object} updatedData
 * @returns {Promise<Object>}
 */
export async function updateProduct(productId, updatedData) {
    try {
        const docRef = doc(db, COLLECTION_NAME, productId);
        await updateDoc(docRef, {
            ...updatedData,
            updatedAt: serverTimestamp()
        });
        return { id: productId, ...updatedData };
    } catch (error) {
        console.error("Error en updateProduct:", error);
        throw new Error("No se pudo actualizar el producto en Firestore.");
    }
}

/**
 * DELETE: Elimina un producto del catálogo en Firestore. Exclusivo para rol 'admin'.
 * @param {string} productId
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, productId));
    } catch (error) {
        console.error("Error en deleteProduct:", error);
        throw new Error("No se pudo eliminar el producto en Firestore.");
    }
}

/**
 * SEED: Carga los productos iniciales en Firestore si la colección está vacía.
 * Usa los IDs definidos en INITIAL_PRODUCTS_SEED para evitar duplicados.
 * @returns {Promise<Array<Object>>}
 */
export async function seedProductsToFirestore() {
    try {
        for (const item of INITIAL_PRODUCTS_SEED) {
            const { id, ...data } = item;
            await setDoc(doc(db, COLLECTION_NAME, id), {
                ...data,
                updatedAt: serverTimestamp()
            });
        }
        return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
    } catch (error) {
        console.error("Error en seedProductsToFirestore:", error);
        throw new Error("Error al cargar los datos iniciales del catálogo en Firestore.");
    }
}
