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

        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected' });

        const snap = await db.collection('players').get();
        const batch = db.batch();
        const now = Date.now();
        let purged = 0;

        snap.forEach(doc => {
            const data = doc.data();
            // Allow parsing firestore timestamp directly
            const lastUpdate = data.updatedAt ? (data.updatedAt.toMillis ? data.updatedAt.toMillis() : (data.updatedAt._seconds * 1000)) : 0;
            const diffMin = (now - lastUpdate) / 1000 / 60;

            // If the heartbeat hasn't pinged in 2+ minutes, erase player from roster mapping.
            if (diffMin > 2) {
                batch.delete(doc.ref);
                purged++;
            }
        });

        if (purged > 0) {
            await batch.commit();
        }

        return res.status(200).json({ success: true, purged });
    } catch (e) {
        console.error("Server Error in /api/admin_purge_roster:", e);
        return res.status(500).json({ error: e.message });
    }
}
