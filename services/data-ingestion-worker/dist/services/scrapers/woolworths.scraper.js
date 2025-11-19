"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeWoolworths = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SEARCH_API_URL = 'https://www.woolworths.com.au/apis/ui/Search/products';
function buildCategoryKeywordMap(aggregations, facetFilters) {
    const categoryMap = new Map();
    const knownSynonyms = {
        'Full Fat': ['full fat', 'full cream', 'whole milk'],
    };
    const allFilterTerms = new Set(facetFilters);
    const relevantAggregations = ['Allergens', 'Lifestyle'];
    aggregations.forEach(agg => {
        if (relevantAggregations.includes(agg.Name) && agg.ResultsGrouped) {
            agg.ResultsGrouped.forEach((group) => {
                group.Filters.forEach((filter) => allFilterTerms.add(filter.Name));
            });
        }
    });
    allFilterTerms.forEach(term => {
        const keywords = knownSynonyms[term] || [term.toLowerCase()];
        categoryMap.set(term, keywords);
    });
    return categoryMap;
}
function assignCategoriesToProduct(product, categoryMap) {
    var _a, _b, _c, _d, _e;
    const assignedCategories = new Set();
    const searchableText = [
        product.DisplayName,
        (_a = product.AdditionalAttributes) === null || _a === void 0 ? void 0 : _a.description,
        (_b = product.AdditionalAttributes) === null || _b === void 0 ? void 0 : _b.sapsegmentname,
        (_c = product.AdditionalAttributes) === null || _c === void 0 ? void 0 : _c.piessubcategorynamesjson,
        (_d = product.AdditionalAttributes) === null || _d === void 0 ? void 0 : _d.lifestyleanddietarystatement,
        (_e = product.AdditionalAttributes) === null || _e === void 0 ? void 0 : _e.allergystatement,
    ]
        .join(' ')
        .toLowerCase();
    for (const [category, keywords] of categoryMap.entries()) {
        for (const keyword of keywords) {
            if (searchableText.includes(keyword)) {
                assignedCategories.add(category);
                break;
            }
        }
    }
    if (assignedCategories.has('Low Fat') && assignedCategories.has('Full Fat')) {
        const productName = (product.DisplayName || '').toLowerCase();
        if (productName.includes('low fat') || productName.includes('skim') || productName.includes('lite')) {
            assignedCategories.delete('Full Fat');
        }
    }
    return Array.from(assignedCategories);
}
const scrapeWoolworths = (query, filters = []) => __awaiter(void 0, void 0, void 0, function* () {
    let browser = null;
    const allEnrichedProducts = [];
    console.log(`[WoolworthsScraper] Launching browser for query: "${query}" with ${filters.length} filters.`);
    try {
        browser = yield puppeteer_extra_1.default.launch({
            headless: process.env.NODE_ENV === 'production',
            dumpio: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        if (!browser) {
            throw new Error('[WoolworthsScraper] Failed to launch Puppeteer browser.');
        }
        const browserPage = yield browser.newPage();
        yield browserPage.setUserAgent(USER_AGENT);
        yield browserPage.setViewport({ width: 1920, height: 1080 });
        console.log('[WoolworthsScraper] Navigating to homepage to establish session...');
        yield browserPage.goto('https://www.woolworths.com.au', { waitUntil: 'domcontentloaded' });
        let currentPage = 1;
        let hasMorePages = true;
        let previousPageGtins = new Set();
        while (hasMorePages) {
            console.log(`[WoolworthsScraper] Scraping page ${currentPage}...`);
            const rawData = yield browserPage.evaluate((apiUrl, searchTerm, filterList, pageNum) => {
                return fetch(apiUrl, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        SearchTerm: searchTerm, PageNumber: pageNum, PageSize: 36, SortType: 'TraderRelevance', Filters: filterList,
                    }),
                })
                    .then(response => {
                    if (!response.ok)
                        throw new Error(`API request failed with status ${response.status}`);
                    return response.json();
                })
                    .then(data => {
                    const outerProducts = data.Products || [];
                    const allInnerProducts = [];
                    outerProducts.forEach((group) => {
                        if (group && group.Products)
                            allInnerProducts.push(...group.Products);
                    });
                    return {
                        products: allInnerProducts,
                        aggregations: data.Aggregations || [],
                        facetFilters: data.FacetFilters || [],
                    };
                });
            }, SEARCH_API_URL, query, filters, currentPage);
            if (rawData.products.length === 0) {
                hasMorePages = false;
                console.log(`[WoolworthsScraper] Page ${currentPage} has no products. Ending pagination.`);
                continue;
            }
            const currentPageGtins = new Set(rawData.products.map(p => p.Barcode).filter(Boolean));
            if (currentPageGtins.size > 0 && Array.from(currentPageGtins).every(gtin => previousPageGtins.has(gtin))) {
                hasMorePages = false;
                console.log(`[WoolworthsScraper] Page ${currentPage} contains only duplicate products. Ending pagination.`);
                continue;
            }
            if (currentPageGtins.size > 0) {
                previousPageGtins = currentPageGtins;
            }
            const categoryMap = buildCategoryKeywordMap(rawData.aggregations, rawData.facetFilters);
            const enrichedProducts = rawData.products.map(product => ({
                gtin: product.Barcode || 'N/A',
                name: product.DisplayName,
                brand: product.Brand || 'N/A',
                price: product.Price,
                imageUrl: product.MediumImageFile,
                size: product.PackageSize,
                store: 'Woolworths',
                categories: assignCategoriesToProduct(product, categoryMap),
            }));
            allEnrichedProducts.push(...enrichedProducts);
            currentPage++;
        }
        console.log(`[WoolworthsScraper] Pagination complete. Total enriched products: ${allEnrichedProducts.length}.`);
        return allEnrichedProducts;
    }
    catch (error) {
        const err = error;
        console.error(`[WoolworthsScraper] An error occurred: ${err.message}`);
        return allEnrichedProducts;
    }
    finally {
        if (browser) {
            console.log('[WoolworthsScraper] Closing browser.');
            yield browser.close();
        }
    }
});
exports.scrapeWoolworths = scrapeWoolworths;
