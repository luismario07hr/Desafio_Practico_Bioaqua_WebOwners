/**
 * ============================================================================
 * ARCHIVO: js/services/productService.js
 * RESPONSABILIDAD: Operaciones CRUD completas sobre la entidad principal
 * `productos` en Cloud Firestore (con respaldo automático en LocalStorage
 * cuando aún no se han configurado las llaves de Firebase).
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

import { db, isFirebaseConfigured } from "../config/firebaseConfig.js";
import { INITIAL_PRODUCTS_SEED } from "./seed.js";

const COLLECTION_NAME = "productos";
const LOCAL_PRODUCTS_KEY = "bioaqua_local_productos";

/**
 * Obtiene o inicializa el catálogo en almacenamiento local (modo respaldo).
 * @returns {Array<Object>}
 */
function getLocalProductsStore() {
    try {
        const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
        if (!raw) {
            localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS_SEED));
            return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS_SEED));
            return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
        }
        return parsed;
    } catch (error) {
        console.error("Error leyendo productos locales:", error);
        return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
    }
}

function saveLocalProductsStore(products) {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
}

/**
 * READ (Todos): Obtiene todos los documentos de la colección `productos` desde Firestore.
 * Si la colección en Firestore está vacía en el primer arranque, ejecuta el seed inicial.
 * @returns {Promise<Array<Object>>} Lista de productos Bioaqua.
 */
export async function getAllProducts() {
    try {
        if (isFirebaseConfigured() && db) {
            const snap = await getDocs(collection(db, COLLECTION_NAME));
            if (snap.empty) {
                // Poblar automáticamente en el primer uso para que nunca aparezca vacío sin razón
                await seedProductsToFirestore();
                const seededSnap = await getDocs(collection(db, COLLECTION_NAME));
                return seededSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            }
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        // Modo Respaldo Local con simulación asíncrona
        await new Promise((r) => setTimeout(r, 220));
        return getLocalProductsStore();
    } catch (error) {
        console.error("Error en getAllProducts:", error);
        throw new Error("No se pudo cargar el catálogo de productos Bioaqua.");
    }
}

/**
 * READ (Uno): Obtiene un producto específico por su ID.
 * @param {string} productId ID del documento.
 * @returns {Promise<Object|null>}
 */
export async function getProductById(productId) {
    try {
        if (isFirebaseConfigured() && db) {
            const snap = await getDoc(doc(db, COLLECTION_NAME, productId));
            return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        }

        await new Promise((r) => setTimeout(r, 100));
        const products = getLocalProductsStore();
        return products.find((p) => p.id === productId) || null;
    } catch (error) {
        console.error("Error en getProductById:", error);
        throw new Error("Error al consultar el detalle del producto.");
    }
}

/**
 * CREATE: Crea un nuevo producto en la colección `productos` (Exclusivo rol 'admin').
 * @param {Object} productData Datos validados del producto.
 * @returns {Promise<Object>} Producto creado con su ID asignado.
 */
export async function createProduct(productData) {
    try {
        if (isFirebaseConfigured() && db) {
            const payload = {
                ...productData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), payload);
            return { id: docRef.id, ...productData };
        }

        await new Promise((r) => setTimeout(r, 280));
        const products = getLocalProductsStore();
        const newProduct = {
            id: `bio-prod-${Date.now()}`,
            ...productData,
            createdAt: new Date().toISOString()
        };
        products.unshift(newProduct);
        saveLocalProductsStore(products);
        return newProduct;
    } catch (error) {
        console.error("Error en createProduct:", error);
        throw new Error("No se pudo registrar el nuevo producto. Verifica tus permisos de Administrador.");
    }
}

/**
 * UPDATE: Actualiza un producto existente en la colección `productos` (Exclusivo rol 'admin').
 * @param {string} productId ID del documento a actualizar.
 * @param {Object} updatedData Campos actualizados y validados.
 * @returns {Promise<Object>} Producto actualizado.
 */
export async function updateProduct(productId, updatedData) {
    try {
        if (isFirebaseConfigured() && db) {
            const docRef = doc(db, COLLECTION_NAME, productId);
            await updateDoc(docRef, {
                ...updatedData,
                updatedAt: serverTimestamp()
            });
            return { id: productId, ...updatedData };
        }

        await new Promise((r) => setTimeout(r, 250));
        const products = getLocalProductsStore();
        const index = products.findIndex((p) => p.id === productId);
        if (index === -1) {
            throw new Error("El producto que intentas editar no existe.");
        }
        products[index] = {
            ...products[index],
            ...updatedData,
            id: productId,
            updatedAt: new Date().toISOString()
        };
        saveLocalProductsStore(products);
        return products[index];
    } catch (error) {
        console.error("Error en updateProduct:", error);
        throw new Error("No se pudo actualizar el producto en el catálogo.");
    }
}

/**
 * DELETE: Elimina un producto del catálogo `productos` (Exclusivo rol 'admin').
 * @param {string} productId ID del producto a eliminar.
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
    try {
        if (isFirebaseConfigured() && db) {
            await deleteDoc(doc(db, COLLECTION_NAME, productId));
            return;
        }

        await new Promise((r) => setTimeout(r, 220));
        const products = getLocalProductsStore();
        const filtered = products.filter((p) => p.id !== productId);
        saveLocalProductsStore(filtered);
    } catch (error) {
        console.error("Error en deleteProduct:", error);
        throw new Error("No se pudo eliminar el producto del catálogo.");
    }
}

/**
 * SEED: Carga o restaura los 13 productos oficiales de Bioaqua SV/GT en Firestore o LocalStorage.
 * @returns {Promise<Array<Object>>}
 */
export async function seedProductsToFirestore() {
    try {
        if (isFirebaseConfigured() && db) {
            for (const item of INITIAL_PRODUCTS_SEED) {
                const { id, ...data } = item;
                await setDoc(doc(db, COLLECTION_NAME, id), {
                    ...data,
                    updatedAt: serverTimestamp()
                });
            }
            return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
        }

        await new Promise((r) => setTimeout(r, 350));
        saveLocalProductsStore(INITIAL_PRODUCTS_SEED);
        return JSON.parse(JSON.stringify(INITIAL_PRODUCTS_SEED));
    } catch (error) {
        console.error("Error en seedProductsToFirestore:", error);
        throw new Error("Error al cargar los datos iniciales (Seed) del catálogo.");
    }
}

