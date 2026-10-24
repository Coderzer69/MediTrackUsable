import { Request } from 'express';
import prisma from './prisma';

export const logAudit = async (
  userId: string,
  action: string,
  req?: Request,
  details?: Record<string, any>
) => {
  try {
    const rawIp = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip;
    const ip = typeof rawIp === 'string'
      ? rawIp.split(',')[0].trim()
      : Array.isArray(rawIp)
        ? rawIp[0]
        : '127.0.0.1';

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: {
          ip,
          userAgent: req?.headers['user-agent'] || 'unknown',
          ...details,
        },
      },
    });
  } catch (error) {
    console.error('Audit log creation error:', error);
  }
};
