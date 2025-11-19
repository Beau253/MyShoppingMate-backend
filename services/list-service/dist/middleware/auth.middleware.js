"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// This is a temporary solution for the JWT_SECRET. In production, this MUST come from a secure config.
const JWT_SECRET = process.env.JWT_SECRET || 'averysecretkeythatshouldbefromdotenv';
const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header (e.g., "Bearer eyJhbGci...")
            token = req.headers.authorization.split(' ')[1];
            // Verify the token
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Attach the decoded user payload to the request object
            req.user = decoded;
            // Proceed to the next middleware or route handler
            next();
        }
        catch (error) {
            console.error('Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
exports.protect = protect;
