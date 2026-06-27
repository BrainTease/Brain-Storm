import { Injectable } from '@nestjs/common';

@Injectable()
export class RequestContextService {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }
}