import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = '24h';

/**
 * Hash the plain text password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password
 */
export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcryptjs.compare(plainPassword, hashedPassword);
};

/**
 * Generate the JWT token
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Verify and decode the JWT token
 */
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};