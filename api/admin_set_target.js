const { getDb, verifyToken, admin } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch (authErr) {
            console.error("Auth Error in /api/admin_set_target:", authErr.message);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { lat, lng, name } = req.body;
        if (lat == null || lng == null) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const db = getDb();
        if (!db) {
            console.error("DB Not Connected in /api/admin_set_target");
            return res.status(500).json({ error: 'Database not connected' });
        }

        const newTarget = {
            id: 'fox_' + Math.random().toString(36).substr(2, 9),
            name: name || 'Fox ' + Math.floor(Math.random() * 100),
            lat,
            lng,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('targets').add(newTarget);

        return res.status(200).json({ success: true, id: docRef.id });
    } catch (e) {
        console.error("Server Error in /api/admin_set_target:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
