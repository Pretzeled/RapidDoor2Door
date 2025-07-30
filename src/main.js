/*
RapidDoor2Door - A simple web application for managing door-to-door visits.
Copyright (C) 2025 Ezra Kahn

REQUIRE SECURE COOKIES BEFORE DEPLOYING TO PRODUCTION

*/


const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv')
const path = require('path');
const multer = require('multer');
const upload = multer();
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const Database = require('better-sqlite3');
const { randomBytes, createHash } = require('crypto');
const { create } = require('domain');
const db = new Database('clients.db');
db.prepare('CREATE TABLE IF NOT EXISTS clients (placeId TEXT PRIMARY KEY, response TEXT, fname TEXT, lname TEXT, email TEXT, phone TEXT, carMakeAndModel TEXT, notes TEXT, address TEXT, lat REAL, lng REAL)').run();
db.prepare('CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, level INTEGER, homesVisited INTEGER, sessionKey TEXT)').run();
const ADMIN_LEVEL_OWNER = 1;
const ADMIN_LEVEL_STANDARD = 2;

async function createOwner() {
    const prompt = require('prompt-sync')();
    const username = prompt('Enter a username for the owner: ');
    const password = prompt.hide('Enter a password for the owner: ');

    const passwordHash = await bcrypt.hash(password, 12); // Store this in DB

    db.prepare('INSERT INTO admins (username, password, level) VALUES (?, ?, ?)')
    .run(username, passwordHash, ADMIN_LEVEL_OWNER);
}

if (!db.prepare('SELECT * FROM admins WHERE level = ?').get(ADMIN_LEVEL_OWNER)) {
    createOwner();
}

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

function getUser(req) {
    if (!req.cookies || !req.cookies.k) {
        return {authenticationLevel: 0}; // Not authenticated
    }
    const authKey = req.cookies.k;
    const admin = db.prepare('SELECT * FROM admins WHERE sessionKey = ?').get(authKey);
    if (admin) {
        return {authenticationLevel: admin.level, username: admin.username, homesVisited: admin.homesVisited}; // Return the admin level
    }
    return {authenticationLevel: 0}; // Not authenticated
}

app.post('/api/save', upload.none(), (req, res) => {
    const user = getUser(req);
    if (user.authenticationLevel <= 0) {
        console.log('Unauthorized save request');
        res.status(401).send('Unauthorized');
        return;
    }

    console.log('Received save request:', req.body);
    db.prepare('INSERT OR REPLACE INTO clients (placeId, response, fname, lname, email, phone, carMakeAndModel, notes, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.body.placeId, req.body.response, req.body.firstName, req.body.lastName, req.body.email, req.body.phoneNumber, req.body.carMakeAndModel, req.body.notes, req.body.address, req.body.lat, req.body.lng);
    res.sendStatus(200);
});

app.post('/auth', upload.none(), async (req, res) => {
    let username = req.body.username;
	let password = req.body.password;
    console.log(`Authentication attempt for user: ${username}`);

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (!admin) {
        console.log('Authentication failed: User not found');
        res.status(401).send('Incorrect Username and/or Password!');
        return;
    }
    if (!bcrypt.compareSync(password, admin.password)) {
        console.log('Authentication failed: Incorrect password');
        res.status(401).send('Incorrect Username and/or Password!');
        return;
    }
    
    console.log('Authentication successful for user:', username);

    const authKey = randomBytes(32).toString('hex');
    db.prepare('UPDATE admins SET sessionKey = ? WHERE username = ?').run(authKey, username);

    res.cookie('k', authKey); // Set a cookie for auth key
    res.redirect('/'); // Redirect to home page after successful authentication
    
});

app.get(/.*/, (req, res) => {
    const user = getUser(req);
    let requestedPath = req.path;

    // -----  DO NOT EDIT FILE PATH AFTER AUTHENTICATION CHECK -----
    if (user.authenticationLevel > 0) {
        if (requestedPath == '/') {
            requestedPath = '/index.html'; // Default to index.html
        }else if (requestedPath == '/api/visits') {
            const visits = db.prepare('SELECT placeId, lat, lng, response FROM clients').all();
            res.json(visits);
            return;
        }
    }else{
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
        if (user.authenticationLevel > 0 && filePath.endsWith('.html')) { // Inject API key on authenticated HTML pages
            responseText = `<script>window.GOOGLE_MAPS_API_KEY = "${GOOGLE_MAPS_API_KEY}";</script>` + responseText;
        }

        res.send(responseText);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});