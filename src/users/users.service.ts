import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by ID. Throws 404 if not found.
   * Never returns the passwordHash.
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    }
    return user;
  }

  /**
   * Find a user by email (used internally by auth).
   * Returns the full record including passwordHash — only for auth use.
   */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
