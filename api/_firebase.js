const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

let db = null;

function getDb() {
    if (db) return db;
    if (admin.apps.length === 0) {
        try {
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                db = admin.firestore();
                console.log('[+] Firebase Admin Initialized via FIREBASE_SERVICE_ACCOUNT Environment Variable');
            } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    })
                });
                db = admin.firestore();
                console.log('[+] Firebase Admin Initialized via individual Environment Variables');
            } else {
                let servicePath = path.join(process.cwd(), 'serviceAccountKey.json');
                if (!fs.existsSync(servicePath)) {
                    servicePath = path.join(__dirname, '../serviceAccountKey.json');
                }
                if (fs.existsSync(servicePath)) {
                    const serviceAccount = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount)
                    });
                    db = admin.firestore();
                    console.log('[+] Firebase Admin Initialized via serviceAccountKey.json');
                } else {
                    console.warn('[-] Missing Firebase credentials! Set FIREBASE_SERVICE_ACCOUNT env var in Vercel.');
                }
            }
        } catch (e) {
            console.error('[-] Failed to initialize Firebase Admin', e);
        }
    } else {
        db = admin.firestore();
    }
    return db;
}

const JWT_SECRET = 'super_secret_fox_key_123';
const ADMIN_PASSWORD = 'fox';

function verifyToken(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');
    return jwt.verify(token, JWT_SECRET);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
    const R = 6371e3;
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const dPhi = (lat2 - lat1) * rad;
    const dLambda = (lon2 - lon1) * rad;

    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

module.exports = {
    getDb,
    admin,
    JWT_SECRET,
    ADMIN_PASSWORD,
    verifyToken,
    calculateDistance
};
