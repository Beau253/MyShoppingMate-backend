import axios from 'axios';
import { Product, ScraperFunction } from './types';

const API_URL = 'https://api.aldi.com.au/v3/product-search';
const PAGE_SIZE = 30; // Based on the HAR file analysis

/**
 * Creates a URL-friendly slug from a string.
 * e.g., "My Product Name!" -> "my-product-name"
 * @param text The text to slugify.
 * @returns A URL-friendly slug.
 */
const createSlug = (text: string): string => {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim().replace(/\s+/g, '-'); // Replace spaces with hyphens
};

// Define interfaces for the expected ALDI API response structure for type safety
interface AldiProduct {
  sku: string;
  name: string;
  brandName: string | null;
  price: {
    amount: number; // Price is in cents
  };
  assets: {
    url: string;
  }[];
  sellingSize: string | null;
}

interface AldiApiResponse {
  data: AldiProduct[];
  meta: {
    pagination: {
      offset: number;
      limit: number;
      totalCount: number;
    };
  };
}

/**
 * Scrapes ALDI products by directly calling their public search API.
 * This is much more efficient than a full browser scrape.
 */
export const scrapeAldi: ScraperFunction = async (query: string): Promise<Product[]> => {
  const allProducts: Product[] = [];
  let offset = 0;
  let hasMorePages = true;

  console.log(`[AldiScraper] Starting scrape for query: "${query}"`);

  while (hasMorePages) {
    try {
      console.log(`[AldiScraper] Fetching page with offset ${offset}...`);
      const response = await axios.get<AldiApiResponse>(API_URL, {
        params: {
          q: query,
          limit: PAGE_SIZE,
          offset: offset,
          sort: 'relevance',
          // These other params seem to be static but are included for completeness
          currency: 'AUD',
          serviceType: 'walk-in',
          testVariant: 'A',
          servicePoint: 'G107', // This might be a store ID, but seems to work generally
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
      });

      const { data: products, meta } = response.data;

      if (!products || products.length === 0) {
        hasMorePages = false;
        continue;
      }

      const mappedProducts: Product[] = products.map(p => {
        const slug = createSlug(p.name);
        const imageUrl = p.assets[0]?.url
          .replace('{width}', '300')
          .replace('{slug}', slug) || '';

        return {
          gtin: p.sku,
          name: p.name,
          brand: p.brandName || 'ALDI', // Default to ALDI if brand is null
          price: p.price.amount / 100, // Convert cents to dollars
          imageUrl: imageUrl,
          size: p.sellingSize || 'N/A',
          store: 'Aldi' as const,
          categories: [], // No category data in this simple API response
        };
      });

      allProducts.push(...mappedProducts);

      // Check if there are more pages
      offset += PAGE_SIZE;
      hasMorePages = offset < meta.pagination.totalCount;
    } catch (error) {
      console.error(`[AldiScraper] An error occurred during fetch: ${(error as Error).message}`);
      hasMorePages = false; // Stop pagination on error
    }
  }

  console.log(`[AldiScraper] Scraping complete. Total products found: ${allProducts.length}.`);
  return allProducts;
};