// ─── The Daily Drift — Local CMS Server ──────────────────────────────────────
// Runs on http://localhost:4322
// Reads/writes markdown files in src/content/blog/
// Zero impact on Astro build or SEO — this file is never deployed

import express from 'express';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4322;
const BLOG_DIR = path.join(__dirname, 'src/content/blog');

app.use(express.json({ limit: '10mb' }));

// Serve the admin UI static files
app.use('/admin', express.static(path.join(__dirname, 'admin-ui')));

// ── Image upload via multer ───────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, 'public/images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const unique = `${name}-${Date.now()}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/upload — upload image, returns { url: '/images/filename.jpg' }
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/images/${req.file.filename}` });
});

// ── CORS for local dev ────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:4322');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Helper: read post file ────────────────────────────────────────────────────
function readPost(filename) {
  const filepath = path.join(BLOG_DIR, filename);
  const raw = fs.readFileSync(filepath, 'utf-8');
  const { data, content } = matter(raw);
  const slug = filename.replace(/\.(md|mdx)$/, '');
  return { slug, ...data, body: content.trim() };
}

// ── GET /api/posts — list all posts ──────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  try {
    const files = fs.readdirSync(BLOG_DIR)
      .filter(f => f.match(/\.(md|mdx)$/));
    const posts = files.map(f => {
      try { return readPost(f); }
      catch { return null; }
    }).filter(Boolean);

    // Sort by pubDate desc
    posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/posts/:slug — single post ───────────────────────────────────────
app.get('/api/posts/:slug', (req, res) => {
  const filename = `${req.params.slug}.md`;
  const filepath = path.join(BLOG_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Post not found' });
  try {
    res.json(readPost(filename));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/posts — create new post ────────────────────────────────────────
app.post('/api/posts', (req, res) => {
  const { slug, body, ...frontmatter } = req.body;
  if (!slug) return res.status(400).json({ error: 'Slug is required' });

  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const filepath = path.join(BLOG_DIR, `${safeSlug}.md`);

  if (fs.existsSync(filepath)) {
    return res.status(409).json({ error: `Post "${safeSlug}" already exists` });
  }

  // Build frontmatter object matching the content schema
  const fm = {
    title: frontmatter.title || '',
    description: frontmatter.description || '',
    pubDate: frontmatter.pubDate || new Date().toISOString().split('T')[0],
    author: frontmatter.author || 'The Daily Drift',
    ...(frontmatter.authorImage ? { authorImage: frontmatter.authorImage } : {}),
    category: frontmatter.category || 'tech-ai',
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    image: frontmatter.image || '',
    imageAlt: frontmatter.imageAlt || '',
    featured: !!frontmatter.featured,
    trending: !!frontmatter.trending,
    weeklyHighlight: !!frontmatter.weeklyHighlight,
    draft: !!frontmatter.draft,
  };

  const content = matter.stringify(`\n${body || ''}`, fm);
  fs.writeFileSync(filepath, content, 'utf-8');
  res.json({ success: true, slug: safeSlug });
});

// ── PUT /api/posts/:slug — update existing post ───────────────────────────────
app.put('/api/posts/:slug', (req, res) => {
  const { body, newSlug, ...frontmatter } = req.body;
  const oldSlug = req.params.slug;
  const oldPath = path.join(BLOG_DIR, `${oldSlug}.md`);

  if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Post not found' });

  const fm = {
    title: frontmatter.title || '',
    description: frontmatter.description || '',
    pubDate: frontmatter.pubDate || new Date().toISOString().split('T')[0],
    author: frontmatter.author || '',
    ...(frontmatter.authorImage ? { authorImage: frontmatter.authorImage } : {}),
    category: frontmatter.category || 'tech-ai',
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    image: frontmatter.image || '',
    imageAlt: frontmatter.imageAlt || '',
    featured: !!frontmatter.featured,
    trending: !!frontmatter.trending,
    weeklyHighlight: !!frontmatter.weeklyHighlight,
    draft: !!frontmatter.draft,
  };

  const content = matter.stringify(`\n${body || ''}`, fm);

  // Handle slug rename
  const finalSlug = newSlug && newSlug !== oldSlug
    ? newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    : oldSlug;
  const newPath = path.join(BLOG_DIR, `${finalSlug}.md`);

  if (finalSlug !== oldSlug && fs.existsSync(newPath)) {
    return res.status(409).json({ error: 'A post with that slug already exists' });
  }

  fs.writeFileSync(newPath, content, 'utf-8');
  if (finalSlug !== oldSlug) fs.unlinkSync(oldPath);

  res.json({ success: true, slug: finalSlug });
});

// ── DELETE /api/posts/:slug ───────────────────────────────────────────────────
app.delete('/api/posts/:slug', (req, res) => {
  const filepath = path.join(BLOG_DIR, `${req.params.slug}.md`);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Post not found' });
  fs.unlinkSync(filepath);
  res.json({ success: true });
});

// ── Root → redirect to /admin ─────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/admin'));

app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ The Daily Drift CMS');
  console.log(`  ➜  Admin dashboard: http://localhost:${PORT}/admin`);
  console.log('');
});
