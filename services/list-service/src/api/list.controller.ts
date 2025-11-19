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
        INSERT INTO shopping_lists(name, user_id)
        VALUES($1, $2) 
        RETURNING public_id, name, created_at, updated_at;
      `;
      const newList = await pool.query(query, [name, userId]);
      res.status(201).json(newList.rows[0]);
    } catch (error) {
      console.error('Create list error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Get items for a specific shopping list.
   */
  getListItems: async (req: AuthRequest, res: Response) => {
    const { listId } = req.params; // This is the public_id of the list

    try {
      const query = `
        SELECT li.public_id as id, li.product_name as "productName", li.quantity, li.price, li.is_checked as "isChecked"
        FROM list_items li
        JOIN shopping_lists sl ON li.shopping_list_id = sl.id
        JOIN users u ON sl.user_id = u.id
        WHERE sl.public_id = $1 AND u.public_id = $2
        ORDER BY li.created_at ASC;
      `;
      const items = await pool.query(query, [listId, req.user?.userId]);

      if (items.rows.length === 0) {
        const listCheck = await pool.query(
          'SELECT 1 FROM shopping_lists sl JOIN users u ON sl.user_id = u.id WHERE sl.public_id = $1 AND u.public_id = $2',
          [listId, req.user?.userId]
        );
        if (listCheck.rows.length === 0) {
          return res.status(404).json({ message: 'Shopping list not found or access denied.' });
        }
      }

      res.status(200).json(items.rows);
    } catch (error) {
      console.error('Get list items error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Add an item to a shopping list.
   */
  addListItem: async (req: AuthRequest, res: Response) => {
    const { listId } = req.params;
    const { productName, quantity, price } = req.body;

    if (!productName) {
      return res.status(400).json({ message: 'Product name is required.' });
    }

    try {
      // Get internal list ID AND verify ownership
      const listResult = await pool.query(
        `SELECT sl.id 
         FROM shopping_lists sl 
         JOIN users u ON sl.user_id = u.id 
         WHERE sl.public_id = $1 AND u.public_id = $2`,
        [listId, req.user?.userId]
      );

      if (listResult.rows.length === 0) {
        return res.status(404).json({ message: 'Shopping list not found or access denied.' });
      }
      const internalListId = listResult.rows[0].id;

      const query = `
        INSERT INTO list_items(shopping_list_id, product_name, quantity, price)
        VALUES($1, $2, $3, $4)
        RETURNING public_id as id, product_name as "productName", quantity, price, is_checked as "isChecked";
      `;
      const newItem = await pool.query(query, [internalListId, productName, quantity || 1, price || 0.0]);
      res.status(201).json(newItem.rows[0]);
    } catch (error) {
      console.error('Add list item error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Update a list item (e.g. toggle check).
   */
  updateListItem: async (req: AuthRequest, res: Response) => {
    const { listId, itemId } = req.params;
    const { isChecked, quantity, price } = req.body;

    try {
      let updateFields = [];
      let values = [];
      let valueCounter = 1;

      if (isChecked !== undefined) {
        updateFields.push(`is_checked = $${valueCounter++} `);
        values.push(isChecked);
      }
      if (quantity !== undefined) {
        updateFields.push(`quantity = $${valueCounter++} `);
        values.push(quantity);
      }
      if (price !== undefined) {
        updateFields.push(`price = $${valueCounter++} `);
        values.push(price);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update.' });
      }

      values.push(itemId); // public_id of item

      // Verify ownership via the list associated with the item
      const ownershipCheck = await pool.query(
        `SELECT li.id 
           FROM list_items li
           JOIN shopping_lists sl ON li.shopping_list_id = sl.id
           JOIN users u ON sl.user_id = u.id
           WHERE li.public_id = $1 AND u.public_id = $2`,
        [itemId, req.user?.userId]
      );

      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Item not found or access denied.' });
      }

      const query = `
        UPDATE list_items
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE public_id = $${valueCounter}
        RETURNING public_id as id, product_name as "productName", quantity, price, is_checked as "isChecked";
      `;

      const updatedItem = await pool.query(query, values);

      if (updatedItem.rows.length === 0) {
        return res.status(404).json({ message: 'Item not found.' });
      }

      res.status(200).json(updatedItem.rows[0]);
    } catch (error) {
      console.error('Update list item error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
};