import type { PlatformRole } from '@party/shared';
import type { Types } from 'mongoose';
import type { TenantContext } from '../lib/tenant.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: Types.ObjectId;
        platformRoles: PlatformRole[];
      };
      tenant?: TenantContext;
    }
  }
}

export {};
