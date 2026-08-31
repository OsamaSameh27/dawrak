import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/authenticated-user.type';

export function assertBranchAccess(user: AuthenticatedUser, branchId: string): void {
  if (user.role !== Role.ADMIN && user.branchId !== branchId) {
    throw new ForbiddenException('You cannot manage another branch');
  }
}
