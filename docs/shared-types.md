# Shared Types Documentation

## Overview
Centralized TypeScript type definitions for Brain-Storm frontend and backend.

## Location
`packages/types/src/index.ts`

## Core Types

### User
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'instructor' | 'student';
  createdAt: Date;
  updatedAt: Date;
}
```

### Course
```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enrollment
```typescript
interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: Date;
  completedAt?: Date;
}
```

### Credential
```typescript
interface Credential {
  id: string;
  userId: string;
  courseId: string;
  issueDate: Date;
  transactionHash: string;
}
```

## Usage

### Frontend
```typescript
import { User, Course, Enrollment } from '@brain-storm/types';

const user: User = { /* ... */ };
```

### Backend
```typescript
import { User, Course, Enrollment } from '@brain-storm/types';

@Entity()
export class UserEntity implements User {
  // ...
}
```

## Adding New Types
1. Define in `packages/types/src/index.ts`
2. Export from index
3. Update documentation
4. Rebuild: `npm run build -w @brain-storm/types`
