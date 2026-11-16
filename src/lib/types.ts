export type Role = "super_admin" | "admin" | "editor";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  designation: string;
  active: boolean;
  password_hash: string;
  created_at: string;
  last_login: string | null;
};
export type PublicUser = Omit<User, "password_hash">;

export type PostType = "news" | "event" | "programme" | "resource" | "document";
export type PostStatus = "draft" | "pending" | "published";

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
  status: PostStatus;
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
  created_at: string;
  updated_at: string;
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

export type Activity = {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
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
  activity: Activity;
};
export type TableName = keyof Tables;
