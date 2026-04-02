const { getDb, verifyToken, admin, calculateDistance } = require('./_firebase');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    try {
        const user = verifyToken(req);
        if (user.role !== 'student') return res.json({ success: false, msg: "Admins cannot hunt." });

        const { foxId } = req.body;
        const db = getDb();
        if (!db) return res.json({ success: false, msg: "Database offline" });

        const pid = user.id;

        // Fetch player
        const playerSnap = await db.collection('players').doc(pid).get();
        if (!playerSnap.exists) return res.json({ success: false, msg: "Player not found." });
        const player = playerSnap.data();

        if (!player.lat) return res.json({ success: false, msg: "Awaiting GPS lock." });

        // Fetch target
        const targetSnap = await db.collection('targets').doc(foxId).get();
        if (!targetSnap.exists) return res.json({ success: false, msg: "Fox ID invalid or removed." });
        const target = targetSnap.data();

        // Check distance
        const dist = calculateDistance(player.lat, player.lng, target.lat, target.lng);
        if (dist > 25) {
            return res.json({ 
                success: false, 
                msg: `Validation failed. You are ${Math.round(dist)} meters away. Must be <25m.` 
            });
        }

        // Already discovered?
        const discSnap = await db.collection('discoveries')
            .where('playerId', '==', pid)
            .where('foxId', '==', foxId)
            .get();
            
        if (!discSnap.empty) {
            return res.json({ success: false, msg: "You already claimed this fox." });
        }

        // Check all fox items to find its name if want, or just generic:
        const discovery = {
            playerId: pid,
            playerName: player.name || user.name,
            foxId: foxId,
            foxName: `A Fox Target`,
            lat: player.lat,
            lng: player.lng,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('discoveries').add(discovery);
        discovery.id = docRef.id;
        
        res.json({ success: true, discovery });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
