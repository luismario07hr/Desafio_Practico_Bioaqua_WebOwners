// scripts/generate-env.js
const fs = require('fs');
const path = require('path');

// Vercel inyecta las variables aquí durante el despliegue
const firebaseEnv = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

if (!firebaseEnv.apiKey) {
  console.error("ERROR: Falta FIREBASE_API_KEY en las variables de entorno de Vercel.");
  process.exit(1);
}

const outputPath = path.join(__dirname, '..', 'js', 'config', 'firebase.env.js');
const content = `// Archivo generado automáticamente en el build. No editar a mano.
export const firebaseEnv = ${JSON.stringify(firebaseEnv, null, 2)};
`;

fs.writeFileSync(outputPath, content, 'utf-8');
console.log('✅ Archivo js/config/firebase.env.js generado correctamente.');