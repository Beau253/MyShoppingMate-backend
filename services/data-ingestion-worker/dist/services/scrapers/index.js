"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coles_scraper_1 = require("./coles.scraper");
const woolworths_scraper_1 = require("./woolworths.scraper");
const aldi_scraper_1 = require("./aldi.scraper");
// A map of target store names to their scraper function.
// The key (e.g., 'coles') should be lowercase to match the job target.
const scraperMap = {
    coles: coles_scraper_1.scrapeColes,
    woolworths: woolworths_scraper_1.scrapeWoolworths,
    aldi: aldi_scraper_1.scrapeAldi,
};
exports.default = scraperMap;
