const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Direct route for index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin route (though it's also served statically as admin.html)
app.get('/admin-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`
  🦊 FOx Hunt Server Active
  -------------------------
  Operative Hub:  http://localhost:${PORT}
  Command Center: http://localhost:${PORT}/admin.html
  
  (Press Ctrl+C to stop)
    `);
});
