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
