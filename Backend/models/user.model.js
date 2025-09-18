// models/user.model.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const parseExpiryToMs = (expStr) => {
  if (!expStr) return 7 * 24 * 60 * 60 * 1000;
  const num = parseInt(expStr, 10);
  if (expStr.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  if (expStr.endsWith('h')) return num * 60 * 60 * 1000;
  if (expStr.endsWith('m')) return num * 60 * 1000;
  if (expStr.endsWith('s')) return num * 1000;
  return num * 1000;
};

const createFirstAdminIfNotExists = async () => {
  const [rows] = await pool.query(`SELECT id FROM users WHERE role = 'Admin' LIMIT 1`);
  if (rows.length > 0) return; // Admin exists
  const name = process.env.FIRST_ADMIN_NAME;
  const email = process.env.FIRST_ADMIN_EMAIL;
  const plain = process.env.FIRST_ADMIN_PASSWORD;
  if (!name || !email || !plain) {
    console.warn('FIRST_ADMIN_* not set in .env — skipping initial admin creation.');
    return;
  }
  const hashed = await bcrypt.hash(plain, 10);
  const [res] = await pool.query(
    `INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'Admin', 1)`,
    [name, email, hashed]
  );
  console.log(`✅ First admin created with id=${res.insertId} (${email})`);
};

const findByEmail = async (email) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const createUser = async ({ name, email, passwordHash, role = 'User', isVerified = 0 }) => {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, isVerified]
  );
  return result.insertId;
};

// OTP functions
const createOtp = async ({ user_id = null, email, otp_code, type = 'register', expires_at }) => {
  const [res] = await pool.query(
    `INSERT INTO otps (user_id, email, otp_code, type, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [user_id, email, otp_code, type, expires_at]
  );
  return res.insertId;
};

const findValidOtp = async (email, otp) => {
  const [rows] = await pool.query(
    `SELECT * FROM otps WHERE email = ? AND otp_code = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
    [email, otp]
  );
  return rows[0] || null;
};

const markOtpUsed = async (id) => {
  await pool.query(`UPDATE otps SET used = 1 WHERE id = ?`, [id]);
};

// verify user email
const verifyUserEmail = async (userId) => {
  await pool.query(`UPDATE users SET is_verified = 1 WHERE id = ?`, [userId]);
};

// Refresh token functions
const saveRefreshToken = async ({ user_id, token, expires_at }) => {
  const [res] = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
    [user_id, token, expires_at]
  );
  return res.insertId;
};

const findRefreshToken = async (token) => {
  const [rows] = await pool.query(`SELECT * FROM refresh_tokens WHERE token = ? LIMIT 1`, [token]);
  return rows[0] || null;
};

const deleteRefreshToken = async (token) => {
  await pool.query(`DELETE FROM refresh_tokens WHERE token = ?`, [token]);
};

module.exports = {
  createFirstAdminIfNotExists,
  findByEmail,
  findById,
  createUser,
  createOtp,
  findValidOtp,
  markOtpUsed,
  verifyUserEmail,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  parseExpiryToMs
};
