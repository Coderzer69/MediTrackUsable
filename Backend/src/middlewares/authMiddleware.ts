import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required: No token provided' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Authentication required: Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    // Fetch live user from database so role updates take effect immediately
    let liveUser: { id: string; role: Role; email: string } | null = null;
    if (decoded.id) {
      liveUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, email: true },
      });
    }

    req.user = {
      id: liveUser ? liveUser.id : decoded.id,
      role: liveUser ? liveUser.role : decoded.role,
      email: liveUser ? liveUser.email : decoded.email,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // ADMIN has superuser permission across all roles
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }
    next();
  };
};
