const { getDb, verifyToken, admin } = require('./_firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    try {
        const user = verifyToken(req);
        if (user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });

        const { lat, lng } = req.body;
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected' });

        await db.collection('players').doc(user.id).set({
            lat,
            lng,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
