const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const eventRoutes = require('./routes/eventRoutes');
const comprasRoutes = require('./routes/comprasRoutes');
const statsRoutes = require('./routes/statsRoutes');


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/api/compras', comprasRoutes);
app.use('/api', statsRoutes);



app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/events', eventRoutes);


const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

