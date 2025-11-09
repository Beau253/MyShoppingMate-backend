// File: services/data-ingestion-worker/src/run-local-test.ts

import { scraperService } from './services/scraper.service';

console.log('[Local Test] Starting local scraper test for Coles...');

// This is the main execution block.
async function runTest() {
  try {
    // We call the scraper directly, bypassing RabbitMQ.
    // We're hardcoding 'coles' and 'milk' for this test.
    const products = await scraperService.scrape('coles', 'milk');

    console.log(`[Local Test] Scraping finished. Found ${products.length} products.`);
    if (products.length > 0) {
      console.log('[Local Test] Sample product:', products[0]);
    }
  } catch (error) {
    console.error('[Local Test] A critical error occurred:', error);
  } finally {
    console.log('[Local Test] Script finished. You can now close the browser if it is still open.');
    // We add a long delay so the browser doesn't close immediately,
    // allowing you to inspect the final page state.
    await new Promise(res => setTimeout(res, 300000)); // 5-minute delay
  }
}

// Run the test
runTest();
