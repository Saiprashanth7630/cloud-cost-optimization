const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { getDbPool, isDbConnected, memoryStore } = require('../config/db');

const DEMO_USER = {
  id: 'usr_admin_01',
  email: process.env.DEMO_USER_EMAIL || 'admin@cloudopt.io',
  password: process.env.DEMO_USER_PASSWORD || 'admin123',
  name: 'DevOps Engineer',
  role: 'Cloud Architect'
};

/**
 * Register a new user account (stores in MySQL table `users` or memory fallback).
 */
async function register(req, res) {
  try {
    const { name, email, password, role = 'DevOps Engineer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = await getDbPool();
    const dbAvailable = isDbConnected() && pool;

    // Check if user already exists
    if (dbAvailable) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0 || cleanEmail === DEMO_USER.email.toLowerCase()) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
    } else {
      const existing = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existing || cleanEmail === DEMO_USER.email.toLowerCase()) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUser = null;

    if (dbAvailable) {
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name.trim(), cleanEmail, passwordHash, role]
      );
      newUser = {
        id: result.insertId,
        name: name.trim(),
        email: cleanEmail,
        role
      };
    } else {
      newUser = {
        id: memoryStore.nextUserId++,
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role
      };
      memoryStore.users.push(newUser);
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log(`[Auth Controller] New user registered: ${newUser.email} (ID: ${newUser.id})`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: `Registration failed: ${error.message}` });
  }
}

/**
 * Log in existing user or demo user.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check Demo User credentials
    if (cleanEmail === DEMO_USER.email.toLowerCase() && password === DEMO_USER.password) {
      const token = jwt.sign(
        {
          id: DEMO_USER.id,
          email: DEMO_USER.email,
          name: DEMO_USER.name,
          role: DEMO_USER.role
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: DEMO_USER.id,
          email: DEMO_USER.email,
          name: DEMO_USER.name,
          role: DEMO_USER.role
        }
      });
    }

    // 2. Check Database / In-Memory Registered Users
    const pool = await getDbPool();
    const dbAvailable = isDbConnected() && pool;
    let matchedUser = null;

    if (dbAvailable) {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (rows.length > 0) {
        matchedUser = rows[0];
      }
    } else {
      matchedUser = memoryStore.users.find(u => u.email.toLowerCase() === cleanEmail);
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid credentials. User not found. Sign up if you are a new user.' });
    }

    const isMatch = await bcrypt.compare(password, matchedUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

async function getProfile(req, res) {
  return res.json({
    success: true,
    user: req.user
  });
}

module.exports = {
  register,
  login,
  getProfile,
  DEMO_USER
};
