const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { email, password, nombre } = req.body;
    const cedulaFrente = req.files.cedulaFrente?.[0].filename;
    const cedulaDorso = req.files.cedulaDorso?.[0].filename;

    const hash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (email, password, nombre, cedula_frente, cedula_dorso)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, nombre;
    `;

    const values = [email, hash, nombre, cedulaFrente, cedulaDorso];
    const result = await pool.query(query, values);

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Registro error:', error);
    res.status(500).json({ success: false, error: 'Error al registrar usuario.' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({ success: true, token });
  } catch (error) {
    console.error('Login error:', error); // <-- Esta línea es clave
    res.status(500).json({ success: false, error: 'Error al iniciar sesión.' });
  }
};
