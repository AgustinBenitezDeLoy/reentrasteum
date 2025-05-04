const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/ingresos', verificarToken, async (req, res) => {
  const vendedorId = req.userId;
  const dias = parseInt(req.query.dias || 7);

  try {
    const result = await pool.query(`
      SELECT 
        DATE(fecha) as fecha,
        SUM(precio) as total
      FROM compras
      WHERE vendedor_id = $1 AND fecha >= NOW() - INTERVAL '${dias} days'
      GROUP BY DATE(fecha)
      ORDER BY DATE(fecha)
    `, [vendedorId]);

    const labels = result.rows.map(r => r.fecha.toISOString().slice(0, 10));
    const valores = result.rows.map(r => parseFloat(r.total));

    res.json({ success: true, labels, valores });
  } catch (error) {
    console.error('Error al cargar ingresos:', error);
    res.status(500).json({ success: false, error: 'No se pudieron cargar los ingresos' });
  }
});

module.exports = router;
