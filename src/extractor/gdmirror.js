import axios from 'axios';
import { VideoExtractor } from '../models/index.js';
import { USER_AGENT } from '../utils/constants.js';
import { URL } from 'url';

class GDMirror extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'GDMirror';
    this.sources = [];
    this.host = 'https://gdmirrorbot.nl';
    this.client = axios.create();
    this.requiresReferer = true;

    // These will be set dynamically from API response
    this.siteUrls = {};
    this.siteFriendlyNames = {};
    this.sid = '';
  }

  getBaseUrl(url) {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  }

  decodeBase64ToJson(base64String) {
    try {
      const jsonString = Buffer.from(base64String, 'base64').toString('utf8');
      return JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Failed to decode or parse base64 string: ' + e.message);
    }
  }

  processSources(mresultObj, host) {
    if (!mresultObj || typeof mresultObj !== 'object') {
      throw new Error('Invalid mresult object');
    }

    this.sources = [];

    // For each key in mresult, build URL with siteUrls base + mresult[key]
    for (const key in mresultObj) {
      // Check if this key is known (has a base url and friendly name)
      if (!this.siteUrls[key] || !this.siteFriendlyNames[key]) continue;

      const baseUrl = this.siteUrls[key];
      const value = mresultObj[key];

      if (typeof value !== 'string') continue;

      // Combine to get full video URL
      // Example: https://filemoon.nl/e/682d4050edcbada50d656e94 (from mresult "flps":"682d4050edcbada50d656e94")
      const videoUrl = baseUrl + value;

      this.sources.push({
        url: videoUrl,
        quality: this.siteFriendlyNames[key],
        isM3U8: videoUrl.includes('.m3u8'),
      });
    }

    // Add direct GDMirror link if sid is present
    if (this.sid) {
      this.sources.push({
        url: `${host}/dl/${this.sid}`,
        quality: 'GDMirror Direct',
        isM3U8: false,
      });
    }

    if (this.sources.length === 0) {
      throw new Error('No video sources found');
    }

    return this.sources;
  }

  async extract(videoUrl, referer = null) {
    if (!(videoUrl instanceof URL)) {
      videoUrl = new URL(videoUrl);
    }

    try {
      this.sources = [];

      // Get final URL after redirects
      const response = await this.client.get(videoUrl.href, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: referer || videoUrl.origin,
        },
        maxRedirects: 5,
      });

      // Get base host from final URL
      const host = this.getBaseUrl(response.request.res.responseUrl || videoUrl.href);

      // Extract embed id from path
      const embed = videoUrl.pathname.split('/').pop();

      // Prepare form data to POST sid (embed id)
      const form = new URLSearchParams();
      form.append('sid', embed);

      const postResponse = await this.client.post(`${host}/embedhelper.php`, form.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: videoUrl.href,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      let responseData = postResponse.data;
      if (typeof responseData === 'string') {
        responseData = JSON.parse(responseData);
      }

      if (!responseData.mresult) {
        throw new Error('Missing mresult in response');
      }

      // Decode mresult from base64 to JSON object
      const mresultDecoded = this.decodeBase64ToJson(responseData.mresult);

      // Set these for use in processSources
      this.siteUrls = responseData.siteUrls || {};
      this.siteFriendlyNames = responseData.siteFriendlyNames || {};
      this.sid = responseData.sid || '';

      return this.processSources(mresultDecoded, host);
    } catch (err) {
      console.error('[GDMirror] Extraction failed:', err.message);
      throw err;
    }
  }
}

export default GDMirror;
