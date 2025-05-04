const express = require('express');
const pool = require('../db');
const router = express.Router();

router.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date ASC');
    res.json({ success: true, events: result.rows });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ success: false, error: 'No se pudieron cargar los eventos' });
  }
});

module.exports = router;
