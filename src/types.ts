export type Role =
  | "director"
  | "admin"
  | "product_specialist"
  | "application_specialist"
  | "viewer";
export type ActivityStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled";
export type ActivityType =
  | "demo"
  | "presentation"
  | "exhibition"
  | "training"
  | "refreshment"
  | "visit"
  | "internal"
  | "other";
export type Stage =
  "lead" | "qualified" | "demo" | "proposal" | "negotiation" | "won" | "lost";
export interface Base {
  id: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}
export interface Profile extends Base {
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  region: string;
  skills: string[];
}
export interface Account extends Base {
  name: string;
  type: string;
  city: string;
  province: string;
  address: string;
  territory: string;
  owner_id: string;
  notes: string;
  status: string;
}
export interface Contact extends Base {
  account_id: string;
  full_name: string;
  job_title: string;
  department: string;
  email: string;
  phone: string;
  is_primary: boolean;
}
export interface Product extends Base {
  name: string;
  brand: string;
  category: string;
  description: string;
  source_page: number;
  specs: Record<string, unknown>;
  active?: boolean;
}
export interface Opportunity extends Base {
  title: string;
  account_id: string;
  product_id: string;
  owner_id: string;
  stage: Stage;
  value: number;
  probability: number;
  expected_close: string;
  next_step: string;
  next_action_due_date: string;
  notes: string;
  lost_reason: string;
}
export interface Equipment extends Base {
  product_id: string;
  code: string;
  name: string;
  status: string;
  serial_number: string;
  location: string;
  notes: string;
}
export interface Activity extends Base {
  title: string;
  type: ActivityType;
  account_id: string | null;
  product_id: string | null;
  opportunity_id: string | null;
  owner_id: string;
  start_at: string;
  end_at: string;
  timezone: string;
  location: string;
  objective: string;
  notes: string;
  priority: string;
  status: ActivityStatus;
  report: string;
  outcome: string;
  follow_up_date: string | null;
  participant_ids: string[];
  equipment_ids: string[];
  submitted_at?: string | null;
  approved_by?: string | null;
  approval_note: string;
  budget: number;
  actual_cost: number;
  attendance_count: number;
}
export interface Task extends Base {
  title: string;
  due_date: string;
  assigned_to: string;
  activity_id: string | null;
  account_id: string | null;
  opportunity_id: string | null;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: string;
  notes: string;
}
export interface Attachment extends Base {
  activity_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
}
export interface Audit {
  id: string | number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  occurred_at: string;
  old_data: unknown;
  new_data: unknown;
}
export interface OrgSettings extends Base {
  name: string;
  timezone: string;
}
export interface Tables {
  profiles: Profile;
  accounts: Account;
  contacts: Contact;
  products: Product;
  opportunities: Opportunity;
  equipment: Equipment;
  activities: Activity;
  tasks: Task;
  activity_attachments: Attachment;
  audit_logs: Audit;
  org_settings: OrgSettings;
}
export type Table = keyof Tables;
export type Data = { [K in Table]: Tables[K][] };
export const ROLE_LABEL: Record<Role, string> = {
  director: "Product Director",
  admin: "Administrator",
  product_specialist: "Product Specialist",
  application_specialist: "Application Specialist",
  viewer: "Viewer",
};
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  demo: "Demo",
  presentation: "Presentasi",
  exhibition: "Pameran",
  training: "Training",
  refreshment: "Refreshment",
  visit: "Kunjungan",
  internal: "Internal",
  other: "Lainnya",
};
export const STATUS_LABEL: Record<ActivityStatus, string> = {
  draft: "Draft",
  submitted: "Menunggu persetujuan",
  approved: "Disetujui",
  in_progress: "Berlangsung",
  completed: "Selesai",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};
export const STAGE_LABEL: Record<Stage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  demo: "Demo / Presentasi",
  proposal: "Proposal",
  negotiation: "Negosiasi",
  won: "Won",
  lost: "Lost",
};
