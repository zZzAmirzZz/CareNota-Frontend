export interface AdminProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender?: string;
}

export interface UpdateAdminProfileDto {
  fullName?: string;
  phoneNumber?: string;
  gender?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
