const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv')
const path = require('path');
const multer = require('multer');
const upload = multer();
const cookieParser = require('cookie-parser');

const Database = require('better-sqlite3');
const { randomBytes } = require('crypto');
const db = new Database('clients.db');
db.prepare('CREATE TABLE IF NOT EXISTS clients (placeId TEXT PRIMARY KEY, response TEXT, fname TEXT, lname TEXT, email TEXT, phone TEXT, carMakeAndModel TEXT, notes TEXT, address TEXT, lat REAL, lng REAL)').run();

dotenv.config({ path: 'config/config.cfg' });
dotenv.config({ path: 'config/keys.cfg' });
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 8080;

const publicFolder = path.isAbsolute(process.env.PUBLIC_FOLDER)
  ? process.env.PUBLIC_FOLDER
  : path.join(__dirname, process.env.PUBLIC_FOLDER);

console.log(`Using public folder: ${publicFolder}`);

function respond404(req, res) {
    res.status(404).send('File not found');
}

app.post('/api/save', upload.none(), (req, res) => {
    let authenticated = req.cookies && req.cookies.authkey === authKey; // MAKE SECURE LATER
    if (!authenticated) {
        console.log('Unauthorized save request');
        res.status(401).send('Unauthorized');
        return;
    }

    console.log('Received save request:', req.body);
    db.prepare('INSERT OR REPLACE INTO clients (placeId, response, fname, lname, email, phone, carMakeAndModel, notes, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.body.placeId, req.body.response, req.body.firstName, req.body.lastName, req.body.email, req.body.phoneNumber, req.body.carMakeAndModel, req.body.notes, req.body.address, req.body.lat, req.body.lng);
    res.sendStatus(200);
});

let authKey = null;
authKey = randomBytes(64).toString('hex'); // Generate a random auth key
app.post('/auth', upload.none(), (req, res) => {
    let username = req.body.username;
	let password = req.body.password;
    console.log(`Authentication attempt for user: ${username}`);
    console.log(`Password: ${password}`);
    
    // Placeholder for authentication logic
    if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
        console.log('Authentication successful');
        authKey = randomBytes(64).toString('hex');
        res.cookie('authkey', authKey); // Set a cookie for auth key
        res.redirect('/'); // Redirect to home page after successful authentication
    } else {
       res.send('Incorrect Username and/or Password!');
       res.status(401);
    }
    res.end();
});

app.get(/.*/, (req, res) => {
    console.log(`Received request for: ${req.cookies}`);
    let authenticated = req.cookies && req.cookies.authkey === authKey; // MAKE SECURE LATER
    let requestedPath = req.path;

    if (requestedPath == '/') {
        requestedPath = '/index.html'; // Default to index.html
    }

    // -----  DO NOT EDIT FILE PATH AFTER AUTHENTICATION CHECK -----
    if (!authenticated) {
        requestedPath = '/login.html'; // Serve login if not authenticated
    }

    if (requestedPath == '/api/visits') {
        const visits = db.prepare('SELECT placeId, lat, lng, response FROM clients').all();
        res.json(visits);
        return;
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