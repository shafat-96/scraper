"use strict";

import axios from 'axios';
import { load } from 'cheerio';
import { VideoExtractor } from '../models/index.js';
import { USER_AGENT } from '../utils/constants.js';

/**
 * Filemoon video extractor
 */
class Filemoon extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'Filemoon';
    this.sources = [];
    this.host = 'https://filemoon.sx';
    this.client = axios.create();
  }

  async extract(videoUrl) {
    if (!(videoUrl instanceof URL)) {
      throw new Error('videoUrl must be an instance of URL');
    }

    const options = {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'file_id=40342338; aff=23788; ref_url=https%3A%2F%2Fbf0skv.org%2Fe%2Fm0507zf4xqor; lang=1',
        Priority: 'u=0, i',
        Referer: videoUrl.origin,
        Origin: videoUrl.href,
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': USER_AGENT,
        'Access-Control-Allow-Origin': '*',
      },
    };

    const { data } = await this.client.get(videoUrl.href, options);
    const $ = load(data);

    try {
      const { data: iframeData } = await this.client.get($('iframe').attr('src'), options);
      const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/s.exec(iframeData)[2].replace('eval', ''));
      const links = unpackedData.match(new RegExp('sources:\\[\\{file:"(.*?)"')) ?? [];
      const m3u8Link = links[1];

      this.sources.unshift({
        url: m3u8Link,
        quality: 'auto',
        isM3U8: true,
      });
    } catch (err) {
      console.error('Extraction failed:', err);
      throw err;
    }

    if (this.sources.length === 0) {
      throw new Error('No video sources found');
    }

    return this.sources;
  }
}

export default Filemoon;
