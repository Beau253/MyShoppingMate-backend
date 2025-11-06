import { Request, Response } from 'express';
import { pool } from '../data/db';

export const priceController = {
  /**
   * Get the latest price for one or more products at one or more stores.
   * Query params:
   *  - gtins=GTIN1,GTIN2,... (required)
   *  - storeIds=ID1,ID2,... (required)
   */
  getLatestPrices: async (req: Request, res: Response) => {
    const gtins = (req.query.gtins as string)?.split(',');
    const storeIds = (req.query.storeIds as string)?.split(',');

    if (!gtins || !storeIds) {
      return res.status(400).json({ message: 'Query parameters "gtins" and "storeIds" are required.' });
    }

    try {
      // This is a powerful SQL query that finds the single most recent price
      // for each product/store combination.
      const query = `
        SELECT DISTINCT ON (product_gtin, store_id)
          product_gtin,
          store_id,
          price,
          timestamp
        FROM prices
        WHERE product_gtin = ANY($1::varchar[]) AND store_id = ANY($2::integer[])
        ORDER BY product_gtin, store_id, timestamp DESC;
      `;
      const prices = await pool.query(query, [gtins, storeIds]);
      res.status(200).json(prices.rows);
    } catch (error) {
      console.error('Get latest prices error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Report a new price (e.g., from crowdsourcing).
   */
  reportPrice: async (req: Request, res: Response) => {
    const { product_gtin, store_id, price } = req.body;
    if (!product_gtin || !store_id || price === undefined) {
      return res.status(400).json({ message: 'product_gtin, store_id, and price are required.' });
    }

    try {
      const query = `
        INSERT INTO prices (product_gtin, store_id, price, source_type)
        VALUES ($1, $2, $3, 'crowd')
        RETURNING *;
      `;
      const newPrice = await pool.query(query, [product_gtin, store_id, price]);
      res.status(201).json(newPrice.rows[0]);
    } catch (error) {
      console.error('Report price error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
};