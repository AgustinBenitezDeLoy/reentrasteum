const express = require('express');
const multer = require('multer');
const { verificarToken } = require('../middlewares/authMiddleware');
const pool = require('../db');

const router = express.Router();

// Configuración de subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Publicar entrada
router.post('/nuevo', verificarToken, upload.single('archivo'), async (req, res) => {
  try {
    const { event_id, precio } = req.body;
    const archivo = req.file?.filename;
    const userId = req.userId;

    const query = `
      INSERT INTO tickets (user_id, event_id, precio, archivo)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [userId, event_id, precio, archivo];
    const result = await pool.query(query, values);

    res.json({ success: true, ticket: result.rows[0] });
  } catch (error) {
    console.error('Error al guardar ticket:', error);
    res.status(500).json({ success: false, error: 'No se pudo guardar la entrada.' });
  }
});

// Obtener todas las entradas (sin QR)
router.get('/todas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.precio, e.name AS evento, e.date, e.location, u.nombre AS vendedor
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      JOIN users u ON t.user_id = u.id
      ORDER BY t.creado_en DESC;
    `);
    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('Error al obtener entradas:', error);
    res.status(500).json({ success: false, error: 'No se pudieron obtener las entradas.' });
  }
});

// Obtener entradas por evento
router.get('/por-evento/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    const result = await pool.query(`
      SELECT 
        t.id, t.precio, u.nombre AS vendedor
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.event_id = $1
      ORDER BY t.creado_en DESC;
    `, [eventId]);

    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('Error al obtener reventas por evento:', error);
    res.status(500).json({ success: false, error: 'No se pudieron obtener las entradas.' });
  }
});

// Entradas del usuario logueado
router.get('/mias', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(`
      SELECT 
        t.id, t.precio, t.archivo,
        e.name AS evento, e.date, e.location
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE t.user_id = $1
      ORDER BY t.creado_en DESC;
    `, [userId]);

    res.json({ success: true, tickets: result.rows });
  } catch (error) {
    console.error('Error al obtener tickets del usuario:', error);
    res.status(500).json({ success: false, error: 'No se pudieron obtener tus entradas.' });
  }
});

// Eliminar entrada (solo del usuario logueado)
router.delete('/eliminar/:id', verificarToken, async (req, res) => {
  try {
    const userId = req.userId;
    const ticketId = req.params.id;

    const check = await pool.query(`SELECT * FROM tickets WHERE id = $1 AND user_id = $2`, [ticketId, userId]);
    if (check.rowCount === 0) {
      return res.status(403).json({ success: false, error: 'No autorizado para eliminar esta entrada.' });
    }

    await pool.query(`DELETE FROM tickets WHERE id = $1`, [ticketId]);
    res.json({ success: true, message: 'Entrada eliminada.' });
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({ success: false, error: 'No se pudo eliminar la entrada.' });
  }
});

// Comprar entrada
router.post('/comprar/:id', verificarToken, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const compradorId = req.userId;

    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'La entrada ya no está disponible.' });
    }

    const ticket = ticketResult.rows[0];

    await pool.query(`
      INSERT INTO compras (ticket_id, comprador_id, vendedor_id, precio, fecha, archivo, event_id)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `, [
      ticketId,
      compradorId,
      ticket.user_id,     // vendedor_id
      ticket.precio,
      ticket.archivo,
      ticket.event_id
    ]);

    await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);

    res.json({ success: true, message: 'Compra realizada con éxito.' });
  } catch (error) {
    console.error('Error al procesar la compra:', error);
    res.status(500).json({ success: false, error: 'No se pudo procesar la compra.' });
  }
});

module.exports = router;
