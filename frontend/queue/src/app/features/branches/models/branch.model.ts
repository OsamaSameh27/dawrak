export interface Branch {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  code: string;
  address: string | null;
  addressAr: string | null;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

export interface ManagedBranch extends Branch {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    services: number;
    counters: number;
    users: number;
  };
}

export interface CreateBranchRequest {
  nameAr: string;
  nameEn: string;
  code: string;
  addressAr?: string;
  addressEn?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface UpdateBranchRequest {
  nameAr?: string;
  nameEn?: string;
  addressAr?: string;
  addressEn?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  isActive?: boolean;
}
