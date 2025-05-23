import express from 'express';
import { extractStreamWish } from './extractor/streamwish.js';
import Filemoon from './extractor/filemoon.js';
import GDMirror from './extractor/gdmirror.js';
import VidxDub from './extractor/vidxdub.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/streamwish', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' query param." });
  }

  try {
    const result = await extractStreamWish(videoUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/filemoon', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' query param." });
  }

  try {
    const filemoon = new Filemoon();
    const result = await filemoon.extract(new URL(videoUrl));
    res.json({ sources: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gdmirror', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' query param." });
  }

  try {
    const gdmirror = new GDMirror();
    const result = await gdmirror.extract(new URL(videoUrl));
    res.json({ sources: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vidxdub', async (req, res) => {
  let videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing 'url' query param." });
  }

  try {
    // Clean and fix the URL
    videoUrl = decodeURIComponent(videoUrl).replace(/^["']|["']$/g, '');

    // Ensure valid URL
    if (!videoUrl.includes('://')) {
      videoUrl = 'https://' + videoUrl;
    }

    const vidxdub = new VidxDub();
    const result = await vidxdub.extract(videoUrl);
    res.json({ sources: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
