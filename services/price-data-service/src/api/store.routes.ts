import { Router } from 'express';
import { getStores, addStore } from './store.controller';

const router = Router();

router.get('/', getStores);
router.post('/', addStore);

export default router;
