const { getDb, JWT_SECRET, ADMIN_PASSWORD } = require('./_firebase');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { name, password, isStudent } = req.body;
        let role = 'student';
        let playerId = null;
        let db = getDb();

        if (!db) {
            console.error("DB Not Connected in /api/login");
            return res.status(500).json({ error: 'Database not connected!' });
        }

        if (!isStudent) {
            if (password !== ADMIN_PASSWORD) {
                return res.status(401).json({ error: 'Invalid admin password' });
            }
            role = 'admin';
            playerId = 'admin_' + Math.random().toString(36).substr(2, 9);
        } else {
            if (!name || name.trim() === '') {
                return res.status(400).json({ error: 'Name is required' });
            }
            role = 'student';
            playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            
            try {
                await db.collection('players').doc(playerId).set({
                    id: playerId,
                    name: name.trim(),
                    lat: null,
                    lng: null,
                    updatedAt: Date.now()
                });
            } catch(e) {
                console.error("DB Error at login:", e);
                return res.status(500).json({ error: 'Failed to create player profile' });
            }
            
        }

        const token = jwt.sign({ id: playerId, role, name }, JWT_SECRET, { expiresIn: '12h' });
        return res.status(200).json({ token, role, id: playerId });
    } catch (e) {
        console.error("Server Error in /api/login:", e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
