import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDewH1uiOdgfFYdrrCgpiugBzqM7blEXxE",
  authDomain: "memory-abfbe.firebaseapp.com",
  projectId: "memory-abfbe",
  storageBucket: "memory-abfbe.firebasestorage.app",
  messagingSenderId: "342062100315",
  appId: "1:342062100315:web:af7545eed81b9f4936747e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

/* Por defecto el SDK reintenta operaciones fallidas (red, permisos) hasta
   2 minutos antes de rechazar la promesa — eso hace que una subida con
   reglas de Storage mal configuradas parezca "congelada" sin avisar al
   usuario. Acortamos el límite para que el error aparezca en segundos. */
storage.maxUploadRetryTime = 10000;
storage.maxOperationRetryTime = 10000;
