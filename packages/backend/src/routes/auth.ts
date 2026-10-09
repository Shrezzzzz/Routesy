import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { RegisterSchema, LoginSchema } from '../validators/authValidators';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterSchema.parse(req.body);

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
      },
    });

    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

    sendSuccess(
      res,
      {
        token,
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });

    sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
});

export default router;
