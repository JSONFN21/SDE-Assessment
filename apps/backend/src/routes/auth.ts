import express, { Request, Response } from 'express';
import { prisma } from '../db';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { authMiddleware } from '../middleware/auth';

//renamed branch
const router = express.Router();

/**
 * Code to register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { username, email, password, confirmPassword } = body as {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to register user',
      ...(process.env.NODE_ENV !== 'production' ? { details } : {}),
    });
  }
});

/**
 * Code to login an existing user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to login',
      ...(process.env.NODE_ENV !== 'production' ? { details } : {}),
    });
  }
});

/**
 * Current user profile (protected route)
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: {
        id: true,
        username: true,
        email: true,
      },
      orderBy: { username: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;