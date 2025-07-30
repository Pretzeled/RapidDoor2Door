const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv')
const path = require('path');
const multer = require('multer');
const upload = multer();

const Database = require('better-sqlite3');
const db = new Database('clients.db');
db.prepare('CREATE TABLE IF NOT EXISTS clients (placeId TEXT PRIMARY KEY, response TEXT, fname TEXT, lname TEXT, email TEXT, phone TEXT, carMakeAndModel TEXT, notes TEXT, address TEXT)').run();

dotenv.config({ path: 'config/config.cfg' });
dotenv.config({ path: 'config/keys.cfg' });
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const app = express();

const PORT = process.env.PORT || 8080;

const publicFolder = path.isAbsolute(process.env.PUBLIC_FOLDER)
  ? process.env.PUBLIC_FOLDER
  : path.join(__dirname, process.env.PUBLIC_FOLDER);

console.log(`Using public folder: ${publicFolder}`);

function respond404(req, res) {
    res.status(404).send('File not found');
}

app.post('/api/save', upload.none(), (req, res) => {
    console.log('Received save request:', req.body);
    db.prepare('INSERT OR REPLACE INTO clients (placeId, response, fname, lname, email, phone, carMakeAndModel, notes, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.body.placeId, req.body.response, req.body.firstName, req.body.lastName, req.body.email, req.body.phoneNumber, req.body.carMakeAndModel, req.body.notes, req.body.address);
    res.sendStatus(200);
});

app.get(/.*/, (req, res) => {
    let authenticated = true; // Placeholder for authentication logic

    console.log(`Received request for: ${req.path}`);
    if (req.path == '/api/visits') {
        const visits = db.prepare('SELECT placeId, response FROM clients').all();
        res.json(visits);
        return;
    }

    let requestedPath = req.path;
    if (requestedPath == '/') {
        requestedPath = '/index.html'; // Default to index.html
    }

    // -----  DO NOT EDIT FILE PATH AFTER AUTHENTICATION CHECK -----
    if (!authenticated) {
        requestedPath = '/login.html'; // Serve login if not authenticated
    }
    const filePath = path.join(publicFolder, requestedPath);
    // -----  DO NOT EDIT FILE PATH AFTER AUTHENTICATION CHECK -----
    
    if (!filePath.startsWith(publicFolder)) { // Hopefully mitigate directory traversal attacks
        respond404(req, res);
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            respond404(req, res);
            return;
        }

        let responseText = data.toString();
        if (authenticated && filePath.endsWith('.html')) { // Inject API key on authenticated HTML pages
            responseText = `<script>window.GOOGLE_MAPS_API_KEY = "${GOOGLE_MAPS_API_KEY}";</script>` + responseText; 
        }

        res.send(responseText);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});