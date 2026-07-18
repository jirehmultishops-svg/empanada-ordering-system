import { describe, it, expect, vi } from 'vitest';
import { validateRegister, validateLogin } from '../../src/validators/auth.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../../src/middleware/auth.js';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';

describe('POST /api/auth/register - Validation', () => {
  const validData = {
    name: 'Juan Pérez',
    whatsapp: '1234567890',
    username: 'juanperez',
    password: 'secret123',
  };

  describe('validateRegister', () => {
    it('should pass with valid registration data', () => {
      const result = validateRegister(validData);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should fail when name is empty', () => {
      const result = validateRegister({ ...validData, name: '' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'name' })])
        );
      }
    });

    it('should fail when name is only whitespace', () => {
      const result = validateRegister({ ...validData, name: '   ' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'name' })])
        );
      }
    });

    it('should fail when whatsapp has fewer than 10 digits', () => {
      const result = validateRegister({ ...validData, whatsapp: '123456789' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'whatsapp' })])
        );
      }
    });

    it('should fail when whatsapp has more than 15 digits', () => {
      const result = validateRegister({ ...validData, whatsapp: '1234567890123456' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'whatsapp' })])
        );
      }
    });

    it('should fail when whatsapp contains non-digit characters', () => {
      const result = validateRegister({ ...validData, whatsapp: '12345abc90' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'whatsapp' })])
        );
      }
    });

    it('should accept whatsapp with exactly 10 digits', () => {
      const result = validateRegister({ ...validData, whatsapp: '1234567890' });
      expect(result.valid).toBe(true);
    });

    it('should accept whatsapp with exactly 15 digits', () => {
      const result = validateRegister({ ...validData, whatsapp: '123456789012345' });
      expect(result.valid).toBe(true);
    });

    it('should fail when username is shorter than 3 characters', () => {
      const result = validateRegister({ ...validData, username: 'ab' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should fail when username is longer than 30 characters', () => {
      const result = validateRegister({ ...validData, username: 'a'.repeat(31) });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should fail when username contains special characters', () => {
      const result = validateRegister({ ...validData, username: 'juan_perez!' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should accept alphanumeric username with 3-30 chars', () => {
      const result = validateRegister({ ...validData, username: 'abc123' });
      expect(result.valid).toBe(true);
    });

    it('should fail when password is shorter than 6 characters', () => {
      const result = validateRegister({ ...validData, password: '12345' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'password' })])
        );
      }
    });

    it('should accept password with exactly 6 characters', () => {
      const result = validateRegister({ ...validData, password: '123456' });
      expect(result.valid).toBe(true);
    });

    it('should return multiple errors when multiple fields are invalid', () => {
      const result = validateRegister({ name: '', whatsapp: '123', username: 'a!', password: '12' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
      }
    });

    it('should trim the name in returned data', () => {
      const result = validateRegister({ ...validData, name: '  Juan Pérez  ' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.name).toBe('Juan Pérez');
      }
    });
  });
});

describe('POST /api/auth/login - Validation', () => {
  describe('validateLogin', () => {
    it('should pass with valid login data', () => {
      const result = validateLogin({ username: 'juanperez', password: 'secret123' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual({ username: 'juanperez', password: 'secret123' });
      }
    });

    it('should fail when username is missing', () => {
      const result = validateLogin({ password: 'secret123' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should fail when username is empty string', () => {
      const result = validateLogin({ username: '', password: 'secret123' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should fail when username is only whitespace', () => {
      const result = validateLogin({ username: '   ', password: 'secret123' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'username' })])
        );
      }
    });

    it('should fail when password is missing', () => {
      const result = validateLogin({ username: 'juanperez' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'password' })])
        );
      }
    });

    it('should fail when password is empty string', () => {
      const result = validateLogin({ username: 'juanperez', password: '' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ field: 'password' })])
        );
      }
    });

    it('should fail when both fields are missing', () => {
      const result = validateLogin({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBe(2);
      }
    });

    it('should trim username in returned data', () => {
      const result = validateLogin({ username: '  juanperez  ', password: 'secret123' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.username).toBe('juanperez');
      }
    });

    it('should not trim password', () => {
      const result = validateLogin({ username: 'juanperez', password: '  secret  ' });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.password).toBe('  secret  ');
      }
    });
  });
});

describe('authenticate middleware', () => {
  const mockNext = vi.fn() as unknown as NextFunction;

  function createMockRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it('should return 401 when no Authorization header is present', () => {
    const req = { headers: {} } as AuthRequest;
    const res = createMockRes() as Response;

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token de autenticación requerido' });
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } } as AuthRequest;
    const res = createMockRes() as Response;

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token de autenticación requerido' });
  });

  it('should return 401 when token is invalid', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } } as AuthRequest;
    const res = createMockRes() as Response;

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
  });

  it('should call next and attach user when token is valid', () => {
    const payload = { id: '123', username: 'juanperez', role: 'client' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret');
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = createMockRes() as Response;
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('123');
    expect(req.user!.username).toBe('juanperez');
    expect(req.user!.role).toBe('client');
  });

  it('should return 401 when token is expired', () => {
    const payload = { id: '123', username: 'juanperez', role: 'client' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '0s' });
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthRequest;
    const res = createMockRes() as Response;

    // Small delay to ensure token is expired
    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
  });
});

describe('authorizeAdmin middleware', () => {
  function createMockRes(): Partial<Response> {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it('should call next when user has admin role', () => {
    const req = { user: { id: '1', username: 'admin1', role: 'admin' } } as AuthRequest;
    const res = createMockRes() as Response;
    const next = vi.fn();

    authorizeAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when user has client role', () => {
    const req = { user: { id: '2', username: 'cliente1', role: 'client' } } as AuthRequest;
    const res = createMockRes() as Response;
    const next = vi.fn();

    authorizeAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acceso denegado: se requiere rol de administrador' });
  });

  it('should return 403 when user is not set', () => {
    const req = {} as AuthRequest;
    const res = createMockRes() as Response;
    const next = vi.fn();

    authorizeAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acceso denegado: se requiere rol de administrador' });
  });
});
