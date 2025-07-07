    // src/lib/firebase-admin.ts
    import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
    import { getFirestore, Firestore } from 'firebase-admin/firestore';
    import 'dotenv/config'; // Asegura que las variables de entorno se carguen

    let app: App;

    // Verifica si las variables de entorno necesarias están definidas
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Reemplaza \\n con saltos de línea reales
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    // --- LÍNEAS DE DEPURACIÓN AÑADIDAS ---
    console.log("DEBUG: FIREBASE_PROJECT_ID:", projectId ? "Loaded" : "UNDEFINED");
    console.log("DEBUG: FIREBASE_PRIVATE_KEY:", privateKey ? "Loaded (length " + privateKey.length + ")" : "UNDEFINED");
    console.log("DEBUG: FIREBASE_CLIENT_EMAIL:", clientEmail ? "Loaded" : "UNDEFINED");
    // --- FIN LÍNEAS DE DEPURACIÓN ---


    if (!projectId || !privateKey || !clientEmail) {
      console.error("ERROR: Firebase Admin SDK environment variables are not set.");
      console.error("Please ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are defined in your .env file or environment.");
      throw new Error("Firebase Admin SDK credentials are missing.");
    }

    // Inicializa la aplicación si no ha sido inicializada
    if (getApps().length === 0) {
      try {
        app = initializeApp({
          credential: cert({
            projectId: projectId,
            privateKey: privateKey,
            clientEmail: clientEmail,
          }),
        });
        console.log("Firebase Admin SDK initialized successfully with provided credentials.");
      } catch (error) {
        console.error("Failed to initialize Firebase Admin SDK:", error);
        throw error;
      }
    } else {
      // Si ya está inicializada, obtiene la instancia existente
      app = getApps()[0];
      console.log("Firebase Admin SDK already initialized.");
    }

    const adminDb: Firestore = getFirestore(app);

    export { adminDb };
    