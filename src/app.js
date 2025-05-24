import express from 'express';
import { extractStreamWish } from './extractor/streamwish.js';
import Filemoon from './extractor/filemoon.js';
import GDMirror from './extractor/gdmirror.js';
import VidxDub from './extractor/vidxdub.js';
import Voe from './extractor/voe.js';
import DoodStreamExtractor from './extractor/doodstream.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises'; // Use fs.promises for async file operations
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility: Clean URL
function cleanUrl(raw) {
  let url = decodeURIComponent(raw).replace(/^["']|["']$/g, '');
  if (!url.includes('://')) {
    url = 'https://' + url;
  }
  return url;
}

// --- Rabbit Extractor Logic (Inlined) ---

class EmbedSource {
    constructor(file, sourceType) {
        this.file = file;
        this.type = sourceType;
    }
}

class Track {
    constructor(file, label, kind, isDefault = false) {
        this.file = file;
        this.label = label;
        this.kind = kind;
        if (isDefault) {
            this.default = isDefault;
        }
    }
}

class EmbedSources {
    constructor(sources = [], tracks = [], t = 0, server = 1) {
        this.sources = sources;
        this.tracks = tracks;
        this.t = t;
        this.server = server;
    }
}

const findRabbitScript = async () => {
    // *** THIS IS THE CRUCIAL PATH: Ensure 'rabbit.cjs' exists at this location ***
    const rabbitPathInExtractor = path.join(__dirname, 'extractor', 'rabbit.cjs');

    try {
        await fs.access(rabbitPathInExtractor); // Check if the file exists and is accessible
        return rabbitPathInExtractor;
    } catch (error) {
        // Very explicit error message if .cjs is not found
        throw new Error(`CRITICAL: 'rabbit.cjs' not found at expected path: ${rabbitPathInExtractor}. Please ensure you have RENAMED 'rabbit.js' to 'rabbit.cjs' in your 'src/extractor/' directory.`);
    }
};

// Extractor class, now internal
class RabbitExtractor {
    async extract(embedUrl, referrer = '') { // Added referrer with default empty string
        return new Promise(async (resolve, reject) => {
            try {
                const rabbitPath = await findRabbitScript(); // This will now strictly look in ./extractor/rabbit.cjs
                const childProcess = spawn('node', [
                    rabbitPath,
                    `--embed-url=${embedUrl}`,
                    `--referrer=${referrer}`
                ]);

                let outputData = '';
                let errorData = '';

                childProcess.stdout.on('data', (data) => {
                    outputData += data.toString();
                });

                childProcess.stderr.on('data', (data) => {
                    errorData += data.toString();
                });

                childProcess.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Rabbit process exited with code ${code}: ${errorData}`));
                        return;
                    }

                    try {
                        const parsedOutput = JSON.parse(outputData.trim());
                        const embedSources = new EmbedSources(
                            parsedOutput.sources.map(s => new EmbedSource(s.file, s.type)),
                            parsedOutput.tracks.map(t => new Track(t.file, t.label, t.kind, t.default)),
                            parsedOutput.t,
                            parsedOutput.server
                        );
                        resolve(embedSources);
                    } catch (error) {
                        reject(new Error(`Failed to parse Rabbit output: ${error.message}. Raw output: ${outputData}`));
                    }
                });

                childProcess.on('error', (error) => {
                    reject(new Error(`Failed to spawn Rabbit process: ${error.message}`));
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}

// --- API Endpoints ---

app.get('/api/streamwish', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const result = await extractStreamWish(videoUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/filemoon', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const filemoon = new Filemoon();
    const result = await filemoon.extract(new URL(cleanUrl(videoUrl)));
    res.json({ sources: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gdmirror', async (req, res) => {
  const videoUrl = req.query.url;
  const provider = req.query.provider;

  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const gdmirror = new GDMirror();
    const result = await gdmirror.extract(new URL(cleanUrl(videoUrl)));

    if (!provider) return res.json({ sources: result });

    const selectedSource = result.find(source => source.quality === provider);
    if (!selectedSource) return res.status(404).json({ error: `Provider '${provider}' not found` });

    try {
      let extractedSource;
      switch (provider) {
        case 'StreamHG':
          extractedSource = await extractStreamWish(selectedSource.url);
          break;
        case 'Filemoon':
          const filemoon = new Filemoon();
          const filemoonResult = await filemoon.extract(new URL(selectedSource.url));
          extractedSource = { sources: filemoonResult };
          break;
        default:
          extractedSource = { sources: [selectedSource] };
      }
      res.json(extractedSource);
    } catch (extractError) {
      res.json({ sources: [selectedSource] });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vidxdub', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const vidxdub = new VidxDub();
    const result = await vidxdub.extract(cleanUrl(videoUrl));
    res.json({ sources: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/voe', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const voe = new Voe();
    const result = await voe.extract(new URL(cleanUrl(videoUrl)));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DoodStream with SSL error fix
app.get('/api/doodstream', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const doodstream = new DoodStreamExtractor();
    const result = await doodstream.extract(cleanUrl(videoUrl));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rabbit endpoint (using the inlined logic)
app.get('/api/rabbit', async (req, res) => {
  const videoUrl = req.query.url;
  const referrer = req.query.referrer || ''; // Add referrer as an optional query param

  if (!videoUrl) return res.status(400).json({ error: "Missing 'url' query param." });

  try {
    const rabbitExtractor = new RabbitExtractor(); // Instantiate the inlined extractor
    const result = await rabbitExtractor.extract(cleanUrl(videoUrl), referrer);
    res.json(result);
  } catch (err) {
    console.error('Error in Rabbit endpoint:', err.message); // Log error for debugging
    res.status(500).json({
      error: 'Internal server error during Rabbit extraction',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});