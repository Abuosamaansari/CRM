// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { findByEmail, createOtp, findValidOtp, markOtpUsed, verifyUserEmail, saveRefreshToken, findRefreshToken, deleteRefreshToken, parseExpiryToMs } = require('../models/user.model');
const sendEmail = require('../utils/email');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const OTP_EXPIRE_MIN = Number(process.env.OTP_EXPIRE_MIN || 10);

exports.sendOtp = async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) return res.status(400).json({ message: 'email and type required' });
    const user = await findByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found. Admin should create user first.' });

    // For register: only if user not verified
    if (type === 'register' && user.is_verified === 1) {
      return res.status(400).json({ message: 'User already verified' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MIN * 60 * 1000);

    await createOtp({ user_id: user.id, email, otp_code: otp, type, expires_at: expiresAt });
    await sendEmail(email, 'Your Billing App OTP', `Your OTP is ${otp}. It expires in ${OTP_EXPIRE_MIN} minutes.`);

    return res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'email and otp required' });

    const record = await findValidOtp(email, otp);
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });

    // mark used and verify user
    await markOtpUsed(record.id);
    if (record.type === 'register') {
      await verifyUserEmail(record.user_id);
    }
    return res.json({ message: 'OTP verified' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password required' });

    const user = await findByEmail(email);
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    if (user.is_verified === 0) return res.status(403).json({ message: 'Email not verified. Please verify OTP.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id });

    // compute refresh token expire time for DB
    const expireMs = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRE || '7d');
    const expiresAt = new Date(Date.now() + expireMs);

    await saveRefreshToken({ user_id: user.id, token: refreshToken, expires_at: expiresAt });

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    const dbRec = await findRefreshToken(refreshToken);
    if (!dbRec) return res.status(401).json({ message: 'Refresh token not found or already revoked' });

    // verify JWT
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      // token invalid -> delete from DB if present
      await deleteRefreshToken(refreshToken);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // generate new access token (optionally: rotate refresh token)
    const userId = payload.id;
    // in DB we can also check expiry: dbRec.expires_at > NOW handled by client side or addition check
    const newAccess = signAccessToken({ id: userId, role: dbRec.role || undefined });
    return res.json({ accessToken: newAccess });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
    await deleteRefreshToken(refreshToken);
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
