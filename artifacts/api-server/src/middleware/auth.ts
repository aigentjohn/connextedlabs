import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export interface AuthRequest extends Request {
  userId: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    logger.warn({ err: error }, 'Token validation failed');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as AuthRequest).userId = user.id;
  next();
}

/**
 * Checks that the authenticated user has user_class 10 (Platform Admin).
 * Must be used after requireAuth.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as AuthRequest).userId;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('user_class')
    .eq('id', userId)
    .single();

  if (error || !data || data.user_class !== 10) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}
