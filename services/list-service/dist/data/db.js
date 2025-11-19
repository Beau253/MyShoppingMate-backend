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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDbConnection = exports.pool = void 0;
const pg_1 = require("pg");
const DATABASE_URL = process.env.DATABASE_URL;
exports.pool = new pg_1.Pool({
    connectionString: DATABASE_URL,
});
const testDbConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.pool.query('SELECT NOW()');
        console.log('Database connection successful.');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
});
exports.testDbConnection = testDbConnection;
