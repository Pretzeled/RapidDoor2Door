const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv')
const path = require('path');

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

app.get(/.*/, (req, res) => {
    let authenticated = true; // Placeholder for authentication logic

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