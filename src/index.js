require('dotenv/config');

const express = require("express");
const cors = require('cors');
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env['PORT'];

const MAP_URL = process.env['MAP_URL'];

// Local cache directory
const CACHE_DIR = path.resolve(__dirname, "cache");

// Helper function to create directories if they don't exist
function ensureDirectoryExistence(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

app.use(cors());

// Route to handle tile requests
app.get("/:z/:x/:y.png", async (req, res) => {
    const { z, x, y } = req.params;

    // Path to cache file
    const cachePath = path.join(CACHE_DIR, z, x, `${y}.png`);

    // Check if the file is already cached
    if (fs.existsSync(cachePath)) {
        res.sendFile(cachePath);
        return;
    }

    // If not cached, fetch the image from MapTiler
    const tileUrl = MAP_URL.replace('${z}', z).replace('${x}', x).replace('${y}', y);

    try {
        const response = await axios.get(tileUrl, { responseType: "stream" });

        // Ensure the cache directory exists
        ensureDirectoryExistence(cachePath);

        // Save the image to the cache and serve it
        const writeStream = fs.createWriteStream(cachePath);
        response.data.pipe(writeStream);

        writeStream.on("finish", () => {
            res.sendFile(cachePath);
        });

        writeStream.on("error", (err) => {
            console.error("Error writing cache file:", err);
            res.status(500).send("Internal server error");
        });
    } catch (error) {
        console.error("Error fetching tile:", error);
        res.status(500).send("Failed to fetch tile");
    }
});

app.get('/', (req, res) => {
    res.send('Map cache is running!')
});

app.all('*', (req, res) => {
    res.redirect('/');
});

// Start the server
app.listen(port, () => {
    console.log(`Tile proxy server running at http://localhost:${port}`);
});
