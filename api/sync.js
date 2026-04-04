const { getDb, verifyToken } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch (authErr) {
            console.error("Auth Error in /api/sync:", authErr.message);
            return res.status(401).json({ error: 'Unauthorized: ' + authErr.message });
        }

        const db = getDb();
        if (!db) {
            console.error("DB Not Connected in /api/sync");
            return res.status(500).json({ error: 'Database not connected!' });
        }

        const targets = [];
        const tSnap = await db.collection('targets').get();
        tSnap.forEach(doc => {
            const d = doc.data();
            targets.push({ ...d, id: doc.id });
        });

        const discoveries = [];
        const dSnap = await db.collection('discoveries').get();
        dSnap.forEach(doc => {
            const data = doc.data();
            discoveries.push({
                playerName: data.playerName,
                foxId: data.foxId,
                foxName: data.foxName,
                lat: data.latitude || data.lat || 0,
                lng: data.longitude || data.lng || 0,
                timestamp: data.timestamp ? (data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now()) : Date.now()
            });
        });

        const players = {};
        const pSnap = await db.collection('players').get();
        pSnap.forEach(d => {
            players[d.id] = { id: d.id, ...d.data(), updatedAt: Date.now() };
        });

        return res.status(200).json({ targets, discoveries, players });
    } catch (e) {
        console.error("Server Error in /api/sync:", e);
        return res.status(500).json({ error: 'Internal Server Error', details: e.message });
    }
}
