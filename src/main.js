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

app.get('/', (req, res) => {
    fs.readFile(path.join(publicFolder, 'index.html'), (err, data) => {
        if (err) {
            res.status(500).send('Error reading file');
            return;
        }
        const htmlContent = `<script>window.GOOGLE_MAPS_API_KEY = "${GOOGLE_MAPS_API_KEY}";</script>` + data.toString(); // Inject API key
        res.send(htmlContent);
    });
});

function respond404(req, res) {
    res.status(404).send('File not found');
}

app.get(/.*/, (req, res) => {
    const filePath = path.join(publicFolder, req.path);
    if (!filePath.startsWith(publicFolder)) { // Hopefully mitigate directory traversal attacks
        respond404(req, res);
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            respond404(req, res);
            return;
        }
        res.send(data);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});