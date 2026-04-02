const { getDb, verifyToken, admin } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch(authErr) {
            console.error("Auth Error in /api/update_location:", authErr.message);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { lat, lng } = req.body;
        if (lat == null || lng == null) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const db = getDb();
        if (!db) {
            console.error("DB Not Connected in /api/update_location");
            return res.status(500).json({ error: 'Database not connected' });
        }

        await db.collection('players').doc(user.id).set({
            lat,
            lng,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error("Server Error in /api/update_location:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
