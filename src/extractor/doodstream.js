"use strict";

import axios from 'axios';
import https from 'https';
import { VideoExtractor } from '../models/index.js';
import { URL } from 'url';

class DoodStreamExtractor extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'DoodStream';
    this.sources = [];
    this.requiresReferer = false;

    // Create Axios instance with SSL verification disabled
    this.client = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });

    this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    this.domains = [
      'dood.la', 'dood.ws', 'dood.sh', 'dood.so',
      'dood.pm', 'dood.wf', 'dood.cx', 'dood.yt',
      'dood.li', 'dood.to', 'dood.watch',
      'doodstream.com', 'dooood.com',
      'd0000d.com', 'd000d.com',
      'ds2play.com', 'ds2video.com'
    ];
  }

  createHashTable() {
    return Array.from({ length: 10 }, () =>
      this.alphabet[Math.floor(Math.random() * this.alphabet.length)]
    ).join('');
  }

  getBaseUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    } catch (e) {
      console.error('[DoodStream] Invalid URL:', e);
      throw new Error('Invalid URL provided');
    }
  }

  isDoodStreamUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      return this.domains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  }

  async extract(inputUrl) {
    try {
      if (!this.isDoodStreamUrl(inputUrl)) {
        throw new Error('Not a valid DoodStream URL');
      }

      const videoUrl = inputUrl.includes('/d/') ? inputUrl.replace('/d/', '/e/') : inputUrl;
      const baseUrl = this.getBaseUrl(videoUrl);

      // First request to get embed page
      const response = await this.client.get(videoUrl);

      // Extract MD5 path
      const md5Match = response.data.match(/\/pass_md5\/([^']*)/);
      if (!md5Match) {
        throw new Error('Could not find MD5 pass');
      }

      const md5Path = md5Match[0];
      const md5Url = baseUrl + md5Path;

      // Second request to get actual video link
      const md5Response = await this.client.get(md5Url, {
        headers: {
          'Referer': videoUrl
        }
      });

      // Extract quality from <title>
      const qualityMatch = response.data.match(/<title>[^<]*?(\d{3,4}p)[^<]*?<\/title>/i);
      const quality = qualityMatch ? qualityMatch[1] : 'auto';

      const token = md5Path.split('/').pop();
      const hashTable = this.createHashTable();
      const finalUrl = md5Response.data + hashTable + '?token=' + token;

      this.sources = [{
        url: finalUrl,
        quality: quality,
        isM3U8: false,
        headers: {
          'Referer': baseUrl + '/'
        }
      }];

      return {
        sources: this.sources
      };
    } catch (err) {
      console.error('[DoodStream] Extraction failed:', err);
      throw err;
    }
  }
}

export default DoodStreamExtractor;