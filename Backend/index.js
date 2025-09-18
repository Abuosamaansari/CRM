// index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const pool = require('./config/db');
const { createFirstAdminIfNotExists } = require('./models/user.model');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

app.get('/', (req, res) => res.send({ message: 'Billing Auth API running' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    conn.release();

    await createFirstAdminIfNotExists();

    app.listen(PORT, () => {
      console.log(`🚀 Server started on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
