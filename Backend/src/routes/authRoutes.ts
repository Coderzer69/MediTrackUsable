import { Router } from 'express';
import { register, login, oauthLogin, getMe } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/oauth-login', oauthLogin);
router.get('/me', authenticate, getMe);

export default router;
