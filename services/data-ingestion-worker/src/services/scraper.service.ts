import axios from 'axios';

// A placeholder interface for the key data we want to extract.
interface WoolworthsProduct {
  DisplayName: string;
  Price: number;
  Barcode: string;
  Brand: string | null;
  SmallImageFile: string;
  PackageSize: string;
}

// Type for the nested structure of the API response.
interface WoolworthsResponse {
  Products: {
    Products: WoolworthsProduct[];
  }[];
  SearchResultsCount: number;
}

// A unified data model for a product, regardless of the source.
interface Product {
  gtin: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  size: string;
  store: 'Woolworths' | 'Coles'; // Example stores
}
/**
 * Scrapes Woolworths by mimicking their internal search API call.
 */
async function scrapeWoolworthsAPI(query: string, page: number = 1): Promise<Product[]> {
  const url = 'https://www.woolworths.com.au/apis/ui/Search/products';

  const payload = {
    SearchTerm: query,
    PageNumber: page,
    PageSize: 36,
    SortType: "TraderRelevance",
    Location: `/shop/search/products?searchTerm=${query}`
  };

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  console.log(`[ScraperService] Posting to Woolworths API for query: "${query}", page: ${page}`);

  try {
    // Set a 15-second timeout for the request
    const response = await axios.post<WoolworthsResponse>(url, payload, { headers, timeout: 15000 });
    
    if (!response.data || !response.data.Products) {
      console.log('[ScraperService] Received empty or invalid response from API.');
      return [];
    }

    const products = response.data.Products.flatMap((p: { Products: WoolworthsProduct[] }) => p.Products);

    console.log(`[ScraperService] Found ${products.length} products on page ${page}. Total available: ${response.data.SearchResultsCount}`);

    // Map the complex API response to our simpler, unified data model.
    const formattedProducts: Product[] = products.map((p: WoolworthsProduct): Product => ({
        gtin: p.Barcode,
        name: p.DisplayName,
        brand: p.Brand || 'N/A', // Handle null brand
        price: p.Price,
        imageUrl: p.SmallImageFile,
        size: p.PackageSize,
        store: 'Woolworths',
    }));

    return formattedProducts;

  } catch (error) {
    // Axios provides more detailed error info
    if (axios.isAxiosError(error)) {
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error(`[ScraperService] Request to Woolworths API timed out: ${error.message}`);
      } else if (error.response) {
        console.error(`[ScraperService] Axios error calling Woolworths API: ${error.message}`, { status: error.response.status });
        console.error(`[ScraperService] Response Data: ${JSON.stringify(error.response.data)}`);
      }
    } else {
        const err = error as Error;
        console.error(`[ScraperService] A general error occurred: ${err.message}`);
    }
    return [];
  }
}

export const scraperService = {
  scrape: (target: string, query: string) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        return scrapeWoolworthsAPI(query, 1);
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};