const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
const dbPath = path.resolve(__dirname, 'noted.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            token TEXT UNIQUE
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            domain TEXT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id)
        )`);
    }
});

// API Endpoints

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'Noted Backend is running!' });
});

// Register/Login (Simple)
app.post('/auth', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (user) {
            res.json({ token: user.token });
        } else {
            const token = crypto.randomBytes(16).toString('hex');
            db.run('INSERT INTO users (username, token) VALUES (?, ?)', [username, token], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ token });
            });
        }
    });
});

// Save Note
app.post('/notes', (req, res) => {
    const { token, domain, content } = req.body;
    if (!token || !domain || !content) return res.status(400).json({ error: 'Missing fields' });

    db.get('SELECT id FROM users WHERE token = ?', [token], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid token' });

        db.run('INSERT INTO notes (userId, domain, content) VALUES (?, ?, ?)', [user.id, domain, content], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, noteId: this.lastID });
        });
    });
});

// Get Notes
app.get('/notes', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    db.get('SELECT id FROM users WHERE token = ?', [token], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid token' });

        db.all('SELECT * FROM notes WHERE userId = ? ORDER BY timestamp DESC', [user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
