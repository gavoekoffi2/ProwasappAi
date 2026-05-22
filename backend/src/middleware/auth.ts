import type { NextFunction, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "../utils/errors";

export interface AuthPayload {
  sub: string; // user id
  tenantId: string;
  role: "owner" | "admin" | "agent";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  const token = header.slice(7);
  try {
    req.auth = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

export function requireRole(...roles: AuthPayload["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw unauthorized("Insufficient role");
    next();
  };
}
