const { getDb, verifyToken, admin } = require('./_firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    try {
        const user = verifyToken(req);
        if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        const { lat, lng } = req.body;
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected' });

        const newTarget = {
            id: 'fox_' + Math.random().toString(36).substr(2, 9),
            lat,
            lng,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('targets').add(newTarget);
        
        res.json({ success: true, id: docRef.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
