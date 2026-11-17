/** Access levels from the PAHAD Admin Panel Master Instruction Chart (LA–L6 + SYS). */
export type Role =
  | "super_admin" // L1 A President (the owner account is also LA Founder-Owner)
  | "general_secretary" // L1 B
  | "joint_secretary" // L1 C Joint / Additional Secretary
  | "treasurer" // L1 D Treasury
  | "gb_member" // L1 E Additional Member of the Governing Body (max 5 active)
  | "admin" // L2 E1 Chief Executive Director
  | "executive_secretary" // L2 E2
  | "record_officer" // L2 E3
  | "directorate_head" // L3 D0 Managing Director (scoped to a Directorate)
  | "department_head" // L4 D1 Department Head (scoped to a Department)
  | "project_coordinator" // L5-1 Project Coordinator (scoped to a Programme)
  | "editor" // L6 Member of the General Assembly
  | "sysadmin"; // SYS Website Administrator (technical support only)

export type UnitKind = "directorate" | "department" | "programme" | "project" | "designation" | "district" | "subdivision" | "block" | "gp";

/** Organisational and geographical structure, managed in Admin → Structure. */
export type Unit = {
  id: string;
  kind: UnitKind;
  name: string;
  parent_id: string;
  /** Off = hidden/dormant without deleting anything. */
  active: boolean;
  /** Projects: active, completed or archived. */
  status: string;
  sort: number;
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Title shown with the name (Founder, President, Website Head…). Only a label. */
  designation: string;
  /** Directorate unit id (L3 scope). */
  directorate: string;
  /** Department or Programme unit id (L4 / L5 scope). */
  unit: string;
  /** Geographical tag: District, Subdivision, Block or GP/Ward unit id (G1–G4). */
  geo: string;
  /** Permanent owner (the bootstrapped Founder/President): cannot be removed, demoted or deactivated. */
  owner: boolean;
  /** Finance access set by the Governing Body; empty = default for the role. */
  finance: string;
  active: boolean;
  password_hash: string;
  created_at: string;
  last_login: string | null;
};
export type PublicUser = Omit<User, "password_hash">;

export type PostType = "news" | "event" | "programme" | "resource" | "document";
export type PostStatus = "draft" | "pending" | "published";
/** Who can read a published post. "" (older posts) counts as public. */
export type PostVisibility = "public" | "members";

export type Post = {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: string;
  category: string;
  event_date: string;
  location: string;
  /** Attachment such as a PDF or poster (uploaded, or a Google Drive link). */
  file_url: string;
  /** Registration or application form, e.g. a Google Form link. */
  form_url: string;
  directorate: string;
  /** Department or Programme the item belongs to (optional). */
  unit: string;
  status: PostStatus;
  /** Public, or Members Only (signed-in accounts). */
  visibility: PostVisibility | "";
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  published_at: string;
};

export type MemberStatus = "applicant" | "active" | "inactive" | "rejected";
export type Member = {
  id: string;
  member_no: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  address: string;
  occupation: string;
  category: string;
  interests: string;
  status: MemberStatus;
  source: "admin" | "website";
  notes: string;
  added_by: string;
  directorate: string;
  unit: string;
  /** G4 GP/Ward (or any geo unit). */
  geo: string;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type Task = {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  priority: "low" | "normal" | "high";
  status: TaskStatus;
  /** Governing Body meeting this follow-up came from, if any. */
  meeting_id: string;
  created_at: string;
  updated_at: string;
};

/** Governing Body meeting (GBM). The General Secretary drafts; the President approves. */
export type DraftStatus = "draft" | "submitted" | "approved";
export type Meeting = {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  venue: string;
  status: "scheduled" | "held" | "cancelled";
  agenda: string;
  agenda_status: DraftStatus;
  agenda_approved_by: string;
  notice: string;
  notice_issued_at: string;
  minutes: string;
  minutes_status: DraftStatus;
  minutes_approved_by: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
};

export type Vote = { by: string; name: string; vote: "for" | "against" | "abstain"; at: string };
export type Resolution = {
  id: string;
  meeting_id: string;
  number: string;
  title: string;
  body: string;
  status: "proposed" | "ratified" | "rejected";
  /** JSON array of Vote. */
  votes: string;
  decided_by_name: string;
  decided_at: string;
  created_by_name: string;
  created_at: string;
};

export type CircularAudience = "general_assembly" | "governing_body" | "executive" | "all";
export type Circular = {
  id: string;
  number: string;
  title: string;
  body: string;
  audience: CircularAudience;
  /** Optional geographical unit: only people inside it receive the circular. */
  geo: string;
  /** Meeting this notice is about, if any. */
  meeting_id: string;
  issued_by: string;
  issued_by_name: string;
  created_at: string;
};

export type SubmissionKind = "contact" | "idea" | "volunteer" | "collaborate" | "knowledge";
export type Submission = {
  id: string;
  kind: SubmissionKind;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  message: string;
  status: "new" | "in_progress" | "closed";
  created_at: string;
};

export type Partner = {
  id: string;
  name: string;
  role: string;
  url: string;
  logo: string;
  description: string;
  dark_logo: boolean;
  sort: number;
  created_at: string;
};

export type Media = {
  id: string;
  url: string;
  caption: string;
  album: string;
  uploaded_by: string;
  created_at: string;
};

export const TEAM_SECTIONS = [
  "Governing Body",
  "Executive Body",
  "Secretariat",
  "Directorate",
  "Department",
  "Geographical Unit",
] as const;
export type TeamSection = (typeof TEAM_SECTIONS)[number];

export type TeamMember = {
  id: string;
  name: string;
  section: TeamSection;
  designation: string;
  department: string;
  /** Additional work beyond the main role; hidden on the site when empty. */
  additional_charge: string;
  /** Profile picture: a Google Drive share link or any image URL. */
  photo_url: string;
  sort: number;
  created_at: string;
};

/** Small key/value settings, e.g. "hero:about" → image URL. */
export type Setting = {
  id: string;
  value: string;
  updated_by: string;
  created_at: string;
};

export type Activity = {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
  /** JSON {before, after} for sensitive actions. */
  details: string;
  /** Directorate of the person who acted, so Directorate Heads see their own area. */
  directorate: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
};

export type FinanceType = "income" | "expense" | "donation" | "dues";
export type FinanceStatus = "submitted" | "approved" | "rejected" | "deleted";
export type FinanceApproval = { by: string; name: string; role: Role; decision: "approved" | "rejected"; note: string; at: string };

export type FinanceEntry = {
  id: string;
  entry_no: string;
  type: FinanceType;
  /** Amount in rupees, stored as text with two decimals. */
  amount: string;
  entry_date: string;
  description: string;
  receipt_url: string;
  submitted_by: string;
  submitted_by_name: string;
  status: FinanceStatus;
  /** JSON array of FinanceApproval. */
  approvals: string;
  locked: boolean;
  /** Whether the latest change reached the Google Sheet. */
  synced: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceRequestKind = "edit" | "delete" | "export";
export type FinanceRequest = {
  id: string;
  entry_id: string;
  kind: FinanceRequestKind;
  /** JSON: proposed changes (edit), reason (delete) or filters (export). */
  payload: string;
  requested_by: string;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected" | "used";
  decided_by_name: string;
  created_at: string;
};

/** Writes to Google Sheets/Drive waiting to be retried. */
export type OutboxItem = {
  id: string;
  action: string;
  payload: string;
  attempts: number;
  last_error: string;
  created_at: string;
};

export type Tables = {
  users: User;
  posts: Post;
  members: Member;
  tasks: Task;
  submissions: Submission;
  partners: Partner;
  media: Media;
  team: TeamMember;
  settings: Setting;
  activity: Activity;
  notifications: Notification;
  units: Unit;
  meetings: Meeting;
  resolutions: Resolution;
  circulars: Circular;
  finance: FinanceEntry;
  finance_requests: FinanceRequest;
  outbox: OutboxItem;
};
export type TableName = keyof Tables;
