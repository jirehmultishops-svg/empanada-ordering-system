import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  username: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'empanadas-jireh-secreto-2024';
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[AUTH] No Authorization header or invalid format. Path:', req.path);
    res.status(401).json({ message: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error('[AUTH] Token verification failed. Path:', req.path, 'Error:', error.message, 'Token prefix:', token.substring(0, 20) + '...');
    res.status(401).json({ message: 'Token inválido o expirado' });
    return;
  }
}

export function authorizeAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  next();
}

