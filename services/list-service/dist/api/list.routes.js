"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const list_controller_1 = require("./list.controller");
const router = (0, express_1.Router)();
// Define the routes and protect them
router.get('/', auth_middleware_1.protect, list_controller_1.listController.getLists);
router.post('/', auth_middleware_1.protect, list_controller_1.listController.createList);
// List Items
router.get('/:listId/items', auth_middleware_1.protect, list_controller_1.listController.getListItems);
router.post('/:listId/items', auth_middleware_1.protect, list_controller_1.listController.addListItem);
router.put('/:listId/items/:itemId', auth_middleware_1.protect, list_controller_1.listController.updateListItem);
// Health check remains public
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});
exports.default = router;
