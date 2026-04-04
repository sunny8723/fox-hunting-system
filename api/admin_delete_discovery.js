const { getDb, verifyToken } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch (authErr) {
            console.error("Auth Error in /api/admin_delete_discovery:", authErr.message);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Missing discovery id' });
        }

        const db = getDb();
        if (!db) {
            console.error("DB Not Connected in /api/admin_delete_discovery");
            return res.status(500).json({ error: 'Database not connected' });
        }

        await db.collection('discoveries').doc(id).delete();

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error("Server Error in /api/admin_delete_discovery:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
