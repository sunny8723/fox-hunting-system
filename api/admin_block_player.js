const { getDb, verifyToken } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch (e) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { playerId, block } = req.body;
        if (!playerId) {
            return res.status(400).json({ error: 'Missing playerId' });
        }

        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected' });

        await db.collection('players').doc(playerId).set({ isBlocked: block }, { merge: true });

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error("Server Error in /api/admin_block_player:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
