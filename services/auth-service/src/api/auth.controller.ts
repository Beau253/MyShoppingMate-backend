import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../data/db';
import { config } from '../config';

export const authController = {
  /**
   * Register a new user.
   */
  register: async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // --- Basic Validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    try {
      // --- Check if user already exists ---
      const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }

      // --- Hash the password ---
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // --- Insert new user into the database ---
      const newUserQuery = `
        INSERT INTO users (name, email, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING public_id, name, email;
      `;
      const newUser = await pool.query(newUserQuery, [name, email, passwordHash]);

      res.status(201).json({
        message: 'User registered successfully.',
        user: newUser.rows[0],
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error during registration.' });
    }
  },

  /**
   * Login an existing user.
   */
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      // --- Find the user by email ---
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        // Use a generic error message to prevent email enumeration attacks.
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      const user = userResult.rows[0];

      // --- Compare the provided password with the stored hash ---
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // --- Generate a JWT ---
      const payload = {
        userId: user.public_id,
        email: user.email,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

      res.status(200).json({
        message: 'Login successful.',
        token: token,
        user: {
          public_id: user.public_id,
          name: user.name,
          email: user.email,
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error during login.' });
    }
  },

  /**
   * Request a password reset.
   */
  forgotPassword: async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    try {
      // --- Check if user exists ---
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        // Return 200 OK even if user doesn't exist to prevent email enumeration
        return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
      }
      const user = userResult.rows[0];

      // --- Generate Reset Token ---
      const resetToken = crypto.randomBytes(32).toString('hex');
      // Use SHA256 for deterministic hashing to allow database lookup
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Token expires in 1 hour
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1);

      // --- Store Token Hash and Expiry in DB ---
      await pool.query(
        'UPDATE users SET reset_token_hash = $1, reset_token_expiry = $2 WHERE id = $3',
        [resetTokenHash, expiryDate, user.id]
      );

      // --- MOCK EMAIL SERVICE ---
      console.log('==================================================');
      console.log(`[MOCK EMAIL] Password Reset Requested for ${email}`);
      console.log(`[MOCK EMAIL] Token: ${resetToken}`);
      console.log('==================================================');

      res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

    } catch (error) {
      console.error('Forgot Password error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Reset password using token.
   */
  resetPassword: async (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body; // Added email to request body

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    try {
      // --- Hash the provided token for lookup ---
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // --- Find user with matching email, token hash, and valid expiry ---
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND reset_token_hash = $2 AND reset_token_expiry > NOW()',
        [email, tokenHash]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired password reset token.' });
      }
      const user = userResult.rows[0];

      // --- Hash the new password ---
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // --- Update user's password and clear reset token fields ---
      await pool.query(
        'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expiry = NULL WHERE id = $2',
        [newPasswordHash, user.id]
      );

      res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
      console.error('Reset Password error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  }
};