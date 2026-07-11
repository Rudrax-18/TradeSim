import admin from 'firebase-admin';

if (process.env.FIREBASE_PROJECT_ID) {
  try {
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID,
    };
    
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      config.credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      admin.initializeApp(config);
      console.log('Firebase Admin SDK initialized successfully with Service Account Cert.');
    } else {
      admin.initializeApp(config);
      console.log('Firebase Admin SDK initialized successfully with Project ID fallback ( JWK verification enabled ).');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
  }
} else {
  console.warn('FIREBASE_PROJECT_ID is missing. Mobile OTP verification is disabled.');
}

export default admin;
