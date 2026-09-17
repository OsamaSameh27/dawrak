import { UserRole } from '../../auth/models/auth.models';

export type ManagedStaffRole = Extract<UserRole, 'STAFF' | 'MANAGER'>;

export interface StaffBranchSummary {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  code: string;
}

export interface StaffMember {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: ManagedStaffRole;
  branchId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch: StaffBranchSummary;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: ManagedStaffRole;
  branchId: string;
}

export interface UpdateStaffRequest {
  fullName?: string;
  phone?: string | null;
  role?: ManagedStaffRole;
  branchId?: string;
  isActive?: boolean;
}
