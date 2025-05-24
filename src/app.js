import express from 'express';
import { extractStreamWish } from './extractor/streamwish.js';
import Filemoon from './extractor/filemoon.js';
import GDMirror from './extractor/gdmirror.js';
import VidxDub from './extractor/vidxdub.js';
import Voe from './extractor/voe.js';
import DoodStreamExtractor from './extractor/doodstream.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Utility: Clean URL
function cleanUrl(raw) {
  let url = decodeURIComponent(raw).replace(/^["']|["']$/g, '');
  if (!url.includes('://')) {
    url = 'https://' + url;
  }
  return url;
}

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

// ✅ DoodStream with SSL error fix
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

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
