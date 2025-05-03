// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ Error: JWT_SECRET no está definido en el archivo .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = file.fieldname === 'idFront' ? 'front' : 'back';
    const dir = path.join(__dirname, 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

function authenticateSeller(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, error: 'No autorizado' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.isSeller) return res.status(403).json({ error: 'No eres vendedor' });
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error('Token error:', err);
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

app.get('/api/events', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM events ORDER BY date');
  res.json(rows);
});

app.get('/api/listings/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { rows } = await db.query(
    'SELECT price, seller_name FROM listings WHERE event_id = $1',
    [eventId]
  );
  res.json(rows);
});

app.post('/api/register', upload.fields([
  { name: 'idFront' }, { name: 'idBack' }
]), async (req, res) => {
  try {
    const { fullName, cedulaNumber, email, password, phone } = req.body;
    const frontPath = `/uploads/front/${req.files['idFront'][0].filename}`;
    const backPath = `/uploads/back/${req.files['idBack'][0].filename}`;
    const exists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) return res.status(400).json({ success: false, error: 'Email ya registrado' });
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO users (full_name, cedula_number, id_front, id_back, email, password_hash, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fullName, cedulaNumber, frontPath, backPath, email, hash, phone]
    );
    const user = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const token = jwt.sign({ userId: user.rows[0].id, isSeller: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error en el servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  if (!result.rows.length) return res.status(400).json({ success: false, error: 'Usuario no encontrado' });
  const valid = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!valid) return res.status(400).json({ success: false, error: 'Contraseña inválida' });
  const token = jwt.sign({ userId: result.rows[0].id, isSeller: true }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token });
});

app.get('/api/my-listings', authenticateSeller, async (req, res) => {
  const { rows } = await db.query(
    `SELECT l.id, e.name AS event_name, l.price
     FROM listings l
     JOIN events e ON l.event_id = e.id
     WHERE l.user_id = $1`,
    [req.userId]
  );
  res.json(rows);
});

app.post('/api/sell', authenticateSeller, async (req, res) => {
  const { eventId, price, sellerName } = req.body;
  await db.query(
    'INSERT INTO listings (event_id, user_id, price, seller_name) VALUES ($1, $2, $3, $4)',
    [eventId, req.userId, price, sellerName]
  );
  res.json({ success: true });
});

app.delete('/api/delete-listing/:id', authenticateSeller, async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM listings WHERE id = $1 AND user_id = $2', [id, req.userId]);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
