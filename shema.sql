CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  titulo TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL,
  ubicacion TEXT,
  precio NUMERIC(10,2),
  archivo TEXT,
  creado_en TIMESTAMP DEFAULT NOW()
);
