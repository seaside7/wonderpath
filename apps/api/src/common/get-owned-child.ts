import { NotFoundException } from '@nestjs/common';
import { Child } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Loads a child scoped to its owning parent, throwing NotFoundException
 * if it doesn't exist or belongs to a different parent. Centralizes the
 * ownership check duplicated across every child-scoped service.
 */
export async function getOwnedChild(
  prisma: PrismaService,
  parentId: string,
  childId: string,
  message = 'Child not found',
): Promise<Child> {
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId },
  });

  if (!child) {
    throw new NotFoundException(message);
  }

  return child;
}
