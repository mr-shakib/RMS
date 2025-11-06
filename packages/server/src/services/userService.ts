import prisma from '../db/client';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';

export type UserRole = 'ADMIN' | 'WAITER' | 'CHEF';

interface CreateUserInput {
  username: string;
  password: string;
  role?: UserRole;
}

interface UpdateUserInput {
  username?: string;
  password?: string;
  role?: UserRole;
}

// User type without password for safe return
export type SafeUser = Omit<User, 'password'>;

class UserService {
  private readonly SALT_ROUNDS = 12;

  /**
   * Create a new user with bcrypt password hashing
   */
  async createUser(input: CreateUserInput): Promise<SafeUser> {
    const { username, password, role = 'WAITER' } = input;

    // Validate username
    if (!username || username.trim().length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    // Validate password
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new Error(`Username ${username} is already taken`);
    }

    // Hash password with bcrypt (cost factor 12)
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });

    // Return user without password
    return this.excludePassword(user);
  }

  /**
   * Get user by username (for login)
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.excludePassword(user);
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' },
    });

    return users.map((user) => this.excludePassword(user));
  }

  /**
   * Validate password for authentication
   */
  async validatePassword(username: string, password: string): Promise<SafeUser | null> {
    // Get user with password
    const user = await this.getUserByUsername(username);

    if (!user) {
      return null;
    }

    // Compare password with hashed password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    // Return user without password
    return this.excludePassword(user);
  }

  /**
   * Update user information
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    // Prepare update data
    const updateData: any = {};

    // Update username if provided
    if (input.username) {
      if (input.username.trim().length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      // Check if new username is already taken
      if (input.username !== existingUser.username) {
        const duplicateUser = await prisma.user.findUnique({
          where: { username: input.username },
        });
        if (duplicateUser) {
          throw new Error(`Username ${input.username} is already taken`);
        }
      }

      updateData.username = input.username;
    }

    // Update password if provided
    if (input.password) {
      if (input.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      updateData.password = await bcrypt.hash(input.password, this.SALT_ROUNDS);
    }

    // Update role if provided
    if (input.role) {
      updateData.role = input.role;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.excludePassword(updatedUser);
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    // Prevent deletion of the last admin user
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Helper method to exclude password from user object
   */
  private excludePassword(user: User): SafeUser {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export default new UserService();
