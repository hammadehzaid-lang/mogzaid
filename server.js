const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, callback) => {
      const extension = file.mimetype === 'image/png' ? '.png' : '.jpg';
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png'].includes(file.mimetype));
  }
});

app.use(express.static(publicDir));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const leaderboardFile = path.join(__dirname, 'leaderboard.json');

app.post('/upload', upload.single('image'), (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const score = Number(req.body.score) || 0;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  const filename = path.basename(req.file.filename);
  const imageUrl = '/uploads/' + filename;
  let board = [];
  try { board = JSON.parse(fs.readFileSync(leaderboardFile)); } catch (e) { board = []; }
  board.push({ name, score, image: imageUrl, ts: Date.now() });
  fs.writeFileSync(leaderboardFile, JSON.stringify(board, null, 2));
  res.json({ ok: true });
});

app.get('/leaderboard', (req, res) => {
  let board = [];
  try { board = JSON.parse(fs.readFileSync(leaderboardFile)); } catch (e) { board = []; }
  // Ensure Zaid appears first if present
  const lower = board.map(b => (b.name || '').toLowerCase());
  const idx = lower.findIndex(n => n.includes('zaid'));
  if (idx > 0) {
    const zaid = board.splice(idx, 1)[0];
    board.unshift(zaid);
  }
  res.json(board);
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
