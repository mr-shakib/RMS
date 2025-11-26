import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { AuthenticationError, ValidationError } from '../errors/AppError';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    // Validate username and password
    const user = await userService.validatePassword(username, password);
    if (!user) {
      throw new AuthenticationError('Invalid username or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // For future enhancement, we could maintain a token blacklist
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Verify user still exists
    const user = await userService.getUserById(req.user.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Generate new JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
