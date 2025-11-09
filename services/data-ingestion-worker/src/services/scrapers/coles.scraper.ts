import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product, ScraperFunction } from './types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const COLES_IMAGE_BASE_URL = 'https://productimages.coles.com.au/productimages';

/** Converts a string from SNAKE_CASE or kebab-case to Title Case. */
const toTitleCase = (str: string): string => {
  return str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/**
 * Scrapes Coles products by fetching the search page and parsing the embedded
 * __NEXT_DATA__ JSON object from the initial HTML response.
 */
export const scrapeColes: ScraperFunction = async (query: string): Promise<Product[]> => {
  const searchUrl = `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`;
  console.log(`[ColesScraper] Fetching data for query "${query}" from: ${searchUrl}`);

  try {
    // 1. Fetch the HTML content of the search page
    const { data: html } = await axios.get(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    // 2. Parse the HTML and find the __NEXT_DATA__ script tag
    const $ = cheerio.load(html);
    const scriptTag = $('#__NEXT_DATA__');
    if (scriptTag.length === 0) {
      console.error('[ColesScraper] Error: Could not find the "__NEXT_DATA__" script tag. The website structure may have changed.');
      return [];
    }
    
    // 3. Extract and parse the JSON data
    const scriptContent = scriptTag.html();
    if (!scriptContent) {
      console.error('[ColesScraper] Error: The "__NEXT_DATA__" script tag is empty.');
      return [];
    }
    
    const pageData = JSON.parse(scriptContent);

    if (!pageData || !pageData.props?.pageProps?.searchResults) {
      console.log('[ColesScraper] Could not find __NEXT_DATA__ or searchResults. No products found.');
      return [];
    }

    // 4. Navigate the JSON object and extract product data
    const results = pageData.props.pageProps.searchResults.results || [];

    const mappedProducts: Product[] = results
      .filter((p: any) => p && p._type === 'PRODUCT') // Ensure we only process product items
      .map((product: any) => {
        const categories = new Set<string>();

        // 1. Extract from merchandise hierarchy (e.g., "DAIRY", "WHOLE WHITE")
        if (product.merchandiseHeir) {
          Object.values(product.merchandiseHeir).forEach((value) => {
            if (typeof value === 'string' && value.trim()) {
              categories.add(toTitleCase(value.trim()));
            }
          });
        }

        // 2. Extract from online heirs/tags (e.g., "Lactose Free", "Gluten Free")
        if (product.onlineHeirs?.tags) {
          product.onlineHeirs.tags.forEach((tag: any) => {
            if (tag?.description) {
              categories.add(toTitleCase(tag.description));
            }
          });
        }

        const imageUrl = (product.imageUris && product.imageUris.length > 0)
          ? `${COLES_IMAGE_BASE_URL}${product.imageUris[0].uri}`
          : '';

        return {
          gtin: String(product.id || 'N/A'),
          name: product.name?.trim() || 'N/A',
          brand: product.brand?.trim() || 'N/A',
          price: product.pricing?.now || 0,
          imageUrl,
          size: product.size || 'N/A',
          store: 'Coles' as const,
          categories: Array.from(categories),
        };
      });

    console.log(`[ColesScraper] Scraping complete. Total products found: ${mappedProducts.length}.`);
    return mappedProducts;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[ColesScraper] HTTP Error: ${error.message}`);
      console.error(`[ColesScraper] Status: ${error.response?.status} | URL: ${searchUrl}`);
    } else if (error instanceof SyntaxError) {
      console.error(`[ColesScraper] JSON Parsing Error: ${error.message}. The data structure may have changed.`);
    } else {
      console.error(`[ColesScraper] An unexpected error occurred: ${(error as Error).message}`);
    }
    // It's helpful to log the error stack for debugging
    console.error(error); 
    return []; // Return an empty array on any failure
  }
}