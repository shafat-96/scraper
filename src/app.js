import express from 'express';
import { extractStreamWish } from './extractor/streamwish.js';

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

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
