// Generated from backend API schema
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface CreateCourseDto {
  title: string;
  description: string;
  status?: 'draft' | 'published';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  status?: 'draft' | 'published';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  bio?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  statusCode: number;
}
