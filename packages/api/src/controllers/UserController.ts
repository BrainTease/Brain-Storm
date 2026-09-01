import { Request, Response } from 'express';
import { BaseController } from './BaseController';

interface User {
  id: string;
  name: string;
  email: string;
}

// Mock data
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

export class UserController extends BaseController {
  /**
   * Get all users
   */
  getAllUsers = (req: Request, res: Response): void => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = users.slice(start, end);

    this.success(res, paginatedUsers, {
      pagination: {
        page,
        limit,
        total: users.length,
        totalPages: Math.ceil(users.length / limit),
      },
    });
  };

  /**
   * Get user by ID
   */
  getUserById = (req: Request, res: Response): void => {
    const { id } = req.params;
    const user = users.find((u) => u.id === id);

    if (!user) {
      this.notFound(res, `User with ID ${id} not found`);
      return;
    }

    this.success(res, user);
  };

  /**
   * Create a new user
   */
  createUser = (req: Request, res: Response): void => {
    const { name, email } = req.body;

    // Validation
    if (!name || !email) {
      this.validationError(res, 'Name and email are required', {
        required: ['name', 'email'],
      });
      return;
    }

    const newUser: User = {
      id: String(users.length + 1),
      name,
      email,
    };
    users.push(newUser);

    this.success(res, newUser, { status: 201 });
  };

  /**
   * Update user
   */
  updateUser = (req: Request, res: Response): void => {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = users.find((u) => u.id === id);

    if (!user) {
      this.notFound(res, `User with ID ${id} not found`);
      return;
    }

    if (name) user.name = name;
    if (email) user.email = email;

    this.success(res, user);
  };

  /**
   * Delete user
   */
  deleteUser = (req: Request, res: Response): void => {
    const { id } = req.params;
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      this.notFound(res, `User with ID ${id} not found`);
      return;
    }

    users.splice(index, 1);
    this.success(res, { deleted: true, id });
  };
}
