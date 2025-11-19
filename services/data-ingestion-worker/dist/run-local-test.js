"use strict";
// File: services/data-ingestion-worker/src/run-local-test.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const scraper_service_1 = require("./services/scraper.service");
console.log('[Local Test] Starting local scraper test for Coles...');
// This is the main execution block.
function runTest() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // We call the scraper directly, bypassing RabbitMQ.
            // We're hardcoding 'coles' and 'milk' for this test.
            const products = yield scraper_service_1.scraperService.scrape('coles', 'milk');
            console.log(`[Local Test] Scraping finished. Found ${products.length} products.`);
            if (products.length > 0) {
                console.log('[Local Test] Sample product:', products[0]);
            }
        }
        catch (error) {
            console.error('[Local Test] A critical error occurred:', error);
        }
        finally {
            console.log('[Local Test] Script finished.');
        }
    });
}
// Run the test
runTest();
