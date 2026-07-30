export type UserRole =
  | 'admin'
  | 'analyst'
  | 'senior_analyst'
  | 'qc_manager'
  | 'production_manager';

export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  employee_id: string | null;
  role: UserRole;
  department: string | null;
  title: string | null;
  status: UserStatus;
  avatar_url: string | null;
  signature_url: string | null;
  created_at: string;
}

/** Where each role lands after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/dashboard',
  analyst: '/analyst/dashboard',
  senior_analyst: '/senior/dashboard',
  qc_manager: '/qc/dashboard',
  production_manager: '/production/dashboard',
};

/** Human-readable role labels for the UI. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  analyst: 'Analyst',
  senior_analyst: 'Senior Analyst',
  qc_manager: 'QC Manager',
  production_manager: 'Production Manager',
};

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = (
  Object.keys(ROLE_LABELS) as UserRole[]
).map((value) => ({ value, label: ROLE_LABELS[value] }));
