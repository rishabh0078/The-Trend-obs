// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
// 🔁 Replace this URL with your actual Vercel domain after deploying
//    e.g. 'https://the-daily-drift.vercel.app' or your custom domain
  site: 'https://thedailydrift.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});