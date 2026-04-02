const { getDb, verifyToken } = require('./_firebase');

module.exports = async (req, res) => {
    try {
        const user = verifyToken(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const db = getDb();
        if (!db) return res.status(500).json({ error: 'Database not connected! Vercel requires Firestore.' });

        const targets = [];
        const tSnap = await db.collection('targets').get();
        tSnap.forEach(d => targets.push({ id: d.id, ...d.data() }));

        const discoveries = [];
        const dSnap = await db.collection('discoveries').get();
        dSnap.forEach(d => {
            const data = d.data();
            discoveries.push({
                id: d.id,
                playerId: data.playerId,
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

        res.json({ targets, discoveries, players });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
