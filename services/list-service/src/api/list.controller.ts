import { Request, Response } from 'express';
import { pool } from '../data/db';

// Define our custom request type
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export const listController = {
  /**
   * Get all shopping lists for the authenticated user.
   */
  getLists: async (req: AuthRequest, res: Response) => {
    const userPublicId = req.user?.userId;
    try {
      // Find the internal user ID from the public ID, then fetch their lists
      const query = `
        SELECT sl.public_id, sl.name, sl.created_at, sl.updated_at 
        FROM shopping_lists sl
        JOIN users u ON sl.user_id = u.id
        WHERE u.public_id = $1
        ORDER BY sl.updated_at DESC;
      `;
      const lists = await pool.query(query, [userPublicId]);
      res.status(200).json(lists.rows);
    } catch (error) {
      console.error('Get lists error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Create a new shopping list for the authenticated user.
   */
  createList: async (req: AuthRequest, res: Response) => {
    const userPublicId = req.user?.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'List name is required.' });
    }

    try {
      // We need to get the internal user_id first
      const userResult = await pool.query('SELECT id FROM users WHERE public_id = $1', [userPublicId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found.' });
      }
      const userId = userResult.rows[0].id;

      const query = `
        INSERT INTO shopping_lists (name, user_id) 
        VALUES ($1, $2) 
        RETURNING public_id, name, created_at, updated_at;
      `;
      const newList = await pool.query(query, [name, userId]);
      res.status(201).json(newList.rows[0]);
    } catch (error) {
      console.error('Create list error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
};