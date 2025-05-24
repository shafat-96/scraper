
# 📺 Video Host Extractor API

A Node.js-based RESTful API for extracting video sources from various streaming platforms such as StreamWish, Filemoon, GDMirror, VidxDub, Voe, Doodstream, and Rabbit embeds.

## 🚀 Features

- Unified API to extract playable sources from popular video hosters
- Modular extractor system for extensibility
- Referrer support for Rabbit-based extractors
- Clean, production-ready Express server

---

## 🧱 Technologies Used

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- Modular extractors for each hoster
- Child process integration for Rabbit extractor

---

## 📦 Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/video-extractor-api.git
cd video-extractor-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Ensure Required Files Exist**

> ⚠️ Rename `extractor/rabbit.js` to `rabbit.cjs`.

```bash
mv src/extractor/rabbit.js src/extractor/rabbit.cjs
```

4. **Start the server**

```bash
npm start
```

The server will run on `http://localhost:3000` (or the port defined in `PORT` environment variable).

---

## 📘 API Documentation

All endpoints require a query parameter `url`, which should be the target video page URL.

### ➤ `/api/streamwish`

Extracts sources from StreamWish.

**Query Parameters:**

- `url` – Required

**Example:**
```
GET /api/streamwish?url=https://example.com/embed
```

---

### ➤ `/api/filemoon`

Extracts direct video sources from Filemoon.

**Example:**
```
GET /api/filemoon?url=https://filemoon.sx/e/abcdef
```

---

### ➤ `/api/gdmirror`

Extracts multiple sources from GDMirror with optional provider resolution.

**Query Parameters:**

- `url` – Required
- `provider` – Optional (`StreamHG`, `Filemoon`, etc.)

**Example:**
```
GET /api/gdmirror?url=https://gdmirror.com/abcdef&provider=Filemoon
```

---

### ➤ `/api/vidxdub`

Extracts sources from VidxDub.

**Example:**
```
GET /api/vidxdub?url=https://vidxdub.com/embed/abcdef
```

---

### ➤ `/api/voe`

Extracts sources from Voe.

**Example:**
```
GET /api/voe?url=https://voe.sx/e/abcdef
```

---

### ➤ `/api/doodstream`

Extracts sources from Doodstream, with SSL error handling.

**Example:**
```
GET /api/doodstream?url=https://dood.so/e/abcdef
```

---

### ➤ `/api/rabbit`

Extracts embed sources using the Rabbit extraction engine via a subprocess.

**Query Parameters:**

- `url` – Required
- `referrer` – Optional

**Example:**
```
GET /api/rabbit?url=https://rabbitstream.net/embed/abcdef&referrer=https://site.com
```

---

## 🧪 Example Response

```json
{
  "sources": [
    {
      "file": "https://cdn.example.com/video.m3u8",
      "type": "m3u8"
    }
  ],
  "tracks": [
    {
      "file": "https://cdn.example.com/subs.vtt",
      "label": "English",
      "kind": "subtitles",
      "default": true
    }
  ],
  "t": 0,
  "server": 1
}
```

---

## 🛠️ Development Notes

- Ensure `rabbit.cjs` is in the correct location: `src/extractor/rabbit.cjs`
- Use `fs.promises` for asynchronous file operations
- Modular and extendable extractor architecture

---

## 📝 License

MIT License

---

## 👤 Author

**Your Name**  
[GitHub](https://github.com/yourusername)
