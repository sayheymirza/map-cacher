require('dotenv/config');

const express = require("express");
const cors = require('cors');
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sharp = require('sharp');

const app = express();
const port = process.env['PORT'];

const maps = {
    'google_standard': 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    'osm_bright': 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}@2x.png?api_key=2da14bce-3a30-45fb-8b2e-6280d4197333',
    'outdoors': 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}@2x.png?api_key=2da14bce-3a30-45fb-8b2e-6280d4197333',
    'alidade_smooth_dark': 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png?api_key=2da14bce-3a30-45fb-8b2e-6280d4197333',
    'alidade_smooth_light': 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}@2x.png?api_key=2da14bce-3a30-45fb-8b2e-6280d4197333',
};

// Local cache directory
const CACHE_DIR = path.resolve(process.env['MAP_DIR'], "cache");

// Helper function to create directories if they don't exist
function ensureDirectoryExistence(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

app.use(cors());

app.get('/', (req, res) => {
    res.json({
        maps: Object.keys(maps)
    })
});

// Route to handle tile requests
app.get("/:map/:z/:x/:y.png", async (req, res) => {
    const { map, z, x, y } = req.params;

    if (!maps[map]) {
        return res.status(404);
    }

    // Path to cache file
    const cachePath = path.join(CACHE_DIR, map, z, x, `${y}.png`);

    // Check if the file is already cached
    if (fs.existsSync(cachePath)) {
        res.sendFile(cachePath);
        return;
    }

    // If not cached, fetch the image from MapTiler
    const tileUrl = maps[map].replace('{z}', z).replace('{x}', x).replace('{y}', y);

    console.log(tileUrl);


    try {
        const response = await axios.get(tileUrl, { responseType: "stream" });

        // Ensure the cache directory exists
        ensureDirectoryExistence(cachePath);

        // Save the image to the cache and serve it
        const writeStream = fs.createWriteStream(cachePath);
        // response.data.pipe(writeStream);

        response.data
            .pipe(
                sharp()
                    .png({
                        compressionLevel: 9, quality: 80
                    }).webp({
                        force: true,
                        quality: 90
                    }))
            .pipe(writeStream);

        writeStream.on("finish", () => {
            res.sendFile(cachePath);
        });

        writeStream.on("error", (err) => {
            console.error("Error writing cache file:", err);
            res.status(500).send("Internal server error");
        });
    } catch (error) {
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
