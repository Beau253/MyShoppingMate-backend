import puppeteer, { Browser } from 'puppeteer';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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
 * Scrapes Woolworths using a headless browser to mimic user behavior.
 */
async function scrapeWoolworthsAPI(query: string, page: number = 1): Promise<Product[]> {
  let browser: Browser | null = null;
  console.log(`[ScraperService] Launching headless browser for query: "${query}"`);

  try {
    // Launch Puppeteer. The '--no-sandbox' flag is crucial for running in Docker.
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const browserPage = await browser.newPage();
    await browserPage.setUserAgent(USER_AGENT);

    // Construct the URL and navigate to the page.
    const url = `https://www.woolworths.com.au/shop/search/products?searchTerm=${encodeURIComponent(query)}&pageNumber=${page}`;
    console.log(`[ScraperService] Navigating to: ${url}`);
    await browserPage.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the main product grid container to ensure the page has loaded products.
    const productGridSelector = '.product-grid--tile';
    await browserPage.waitForSelector(productGridSelector, { timeout: 30000 });

    console.log('[ScraperService] Page loaded. Scraping product data...');

    // Execute script in the page context to extract product data.
    const products: Product[] = await browserPage.evaluate((): Product[] => {
      // This function runs in the browser's context, so it can't access variables from the Node.js scope.
      const productTiles = document.querySelectorAll('div.product-tile-v2');
      const results: Product[] = [];

      productTiles.forEach(tile => {
        const nameEl = tile.querySelector('.product-tile-v2--name') as HTMLElement;
        const priceEl = tile.querySelector('.product-tile-v2--price') as HTMLElement;
        const brandEl = tile.querySelector('.product-tile-v2--brand') as HTMLElement;
        const imageEl = tile.querySelector('img.product-tile-v2--image') as HTMLImageElement;
        const sizeEl = tile.querySelector('.product-tile-v2--size') as HTMLElement;

        // Extract price, handling the dollar sign and converting to a number.
        const priceText = priceEl?.innerText.replace('$', '').trim();
        const price = priceText ? parseFloat(priceText) : 0;

        if (nameEl && price) {
          results.push({
            gtin: 'N/A', // Barcode is not available on the search results page.
            name: nameEl.innerText.trim(),
            brand: brandEl?.innerText.trim() || 'N/A',
            price: price,
            imageUrl: imageEl?.src || '',
            size: sizeEl?.innerText.trim() || '',
            store: 'Woolworths',
          });
        }
      });

      return results;
    });

    console.log(`[ScraperService] Scraped ${products.length} products.`);
    return products;

  } catch (error) {
    const err = error as Error;
    if (err.name === 'TimeoutError') {
      console.error(`[ScraperService] Navigation or selector timeout: ${err.message}`);
    } else {
      console.error(`[ScraperService] An error occurred during headless browser scraping: ${err.message}`);
    }
    return [];
  } finally {
    if (browser) {
      console.log('[ScraperService] Closing browser.');
      await browser.close();
    }
  }
}

export const scraperService = {
  scrape: (target: string, query: string) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        return scrapeWoolworthsAPI(query);
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};