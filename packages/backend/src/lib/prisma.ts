import { PrismaClient } from '@prisma/client';

// Singleton pattern — all route files import from here so tests can mock one path
export const prisma = new PrismaClient();
