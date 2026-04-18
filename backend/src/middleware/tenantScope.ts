import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../utils/errors";

// Hard guarantee: any downstream handler can rely on req.auth.tenantId.
// This middleware should always be paired with requireAuth first.
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.tenantId) throw unauthorized("Tenant context missing");
  next();
}
