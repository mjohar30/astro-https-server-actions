import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import db from '@astrojs/db';
import vue from '@astrojs/vue';

import { SitemapStream } from 'sitemap';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { Readable, pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUS_CODE_PAGES = new Set(["404", "500"]);
const isStatusCodePage = (pathname) => {
  if (!pathname) return false;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  if (pathname.startsWith("/")) pathname = pathname.slice(1);
  return STATUS_CODE_PAGES.has(pathname);
};

function sitemapPlugin() {
  let site;
  let finalSiteUrl;

  return {
    name: '@astrojs/sitemap-fix',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
        finalSiteUrl = site ? new URL(config.base || '/', site) : undefined;
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        if (!site) {
          logger.warn('The Sitemap integration requires the `site` astro.config option. Skipping.');
          return;
        }

        const pageUrls = pages.filter((page) => !isStatusCodePage(page.pathname)).map((page) => {
          let pathname = page.pathname || '';
          if (pathname.startsWith('/')) pathname = pathname.slice(1);
          let basePath = finalSiteUrl.pathname;
          if (pathname !== '' && !basePath.endsWith('/')) basePath += '/';
          return new URL(basePath + pathname, finalSiteUrl).href;
        });

        const uniqueUrls = Array.from(new Set(pageUrls));
        if (uniqueUrls.length === 0) {
          logger.warn('No pages found! `sitemap.xml` not created.');
          return;
        }

        const destDir = fileURLToPath(dir);
        await mkdir(destDir, { recursive: true });

        const sitemapStream = new SitemapStream({ hostname: finalSiteUrl.href });
        const writeStream = createWriteStream(resolve(destDir, 'sitemap.xml'));
        const urlObjects = uniqueUrls.map((url) => ({ url }));

        await promisify(pipeline)(Readable.from(urlObjects), sitemapStream, writeStream);
        logger.info('`sitemap.xml` created.');
      }
    }
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemapPlugin(), db(), vue()],
  output: "hybrid",
  adapter: cloudflare()
});