import { Request } from 'express';
import { User } from '../users/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
