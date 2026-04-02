const { getDb, verifyToken } = require('./_firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    try {
        const user = verifyToken(req);
        if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

        const { foxId } = req.body;
        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected' });

        await db.collection('targets').doc(foxId).delete();
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
