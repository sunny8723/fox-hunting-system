const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

let db = null;

function getDb() {
    if (db) return db;
    if (admin.apps.length === 0) {
        try {
            // Check both cwd and parent folder just in case
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
                console.log('[+] Firebase Admin Initialized Successfully');
            } else {
                console.warn('[-] serviceAccountKey.json not found! Required for serverless.');
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

    const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(dLambda/2) * Math.sin(dLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
