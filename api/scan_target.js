const { getDb, verifyToken, admin, calculateDistance } = require('./_firebase');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let user;
        try {
            user = verifyToken(req);
        } catch (authErr) {
            console.error("Auth Error in /api/scan_target:", authErr.message);
            return res.status(401).json({ success: false, msg: 'Unauthorized' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({ success: false, msg: "Admins cannot hunt." });
        }

        const { foxId } = req.body;
        if (!foxId) return res.status(400).json({ success: false, msg: 'Invalid fox ID' });

        const db = getDb();
        if (!db) return res.status(500).json({ success: false, msg: "Database offline" });

        const pid = user.id;

        // Fetch player
        const playerSnap = await db.collection('players').doc(pid).get();
        if (!playerSnap.exists) {
            return res.status(404).json({ success: false, msg: "Player not found." });
        }
        const player = playerSnap.data();

        if (player.isBlocked) {
            return res.status(403).json({ success: false, msg: "ACCESS REVOKED BY COMMAND." });
        }

        if (player.lat == null || player.lng == null) {
            return res.status(400).json({ success: false, msg: "Awaiting GPS lock." });
        }

        // Fetch target
        const targetSnap = await db.collection('targets').doc(foxId).get();
        if (!targetSnap.exists) {
            return res.status(404).json({ success: false, msg: "Fox ID invalid or removed." });
        }
        const target = targetSnap.data();

        // Check distance
        const dist = calculateDistance(player.lat, player.lng, target.lat, target.lng);
        if (dist > 25) {
            return res.status(400).json({
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
            return res.status(400).json({ success: false, msg: "You already claimed this fox." });
        }

        const discovery = {
            playerId: pid,
            playerName: player.name || user.name || "Unknown",
            foxId: foxId,
            foxName: `A Fox Target`,
            lat: player.lat,
            lng: player.lng,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('discoveries').add(discovery);
        discovery.id = docRef.id;

        return res.status(200).json({ success: true, discovery });
    } catch (e) {
        console.error("Server Error in /api/scan_target:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
