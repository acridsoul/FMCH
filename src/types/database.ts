// Database types based on Supabase schema

export type UserRole = 'admin' | 'department_head' | 'crew';

export type Department =
  | 'camera'
  | 'sound'
  | 'lighting'
  | 'art'
  | 'production'
  | 'costume'
  | 'makeup'
  | 'post_production'
  | 'vfx'
  | 'stunts'
  | 'transport'
  | 'catering';

export type ProjectStatus = 'pre-production' | 'production' | 'post-production' | 'completed';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export type ExpenseCategory = 'equipment' | 'crew' | 'location' | 'post-production' | 'other';

export type FileType = 'script' | 'contract' | 'call_sheet' | 'other';

// User Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  department: Department | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Project
export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Project Member
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// Task
export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Schedule
export interface Schedule {
  id: string;
  project_id: string;
  scene_number: string | null;
  scene_description: string | null;
  shoot_date: string;
  shoot_time: string | null;
  location: string | null;
  required_crew: string[] | null;
  equipment_needed: string[] | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Expense
export interface Expense {
  id: string;
  project_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// File
export interface File {
  id: string;
  project_id: string;
  file_name: string;
  file_type: FileType;
  file_url: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

// Conversation
export interface Conversation {
  id: string;
  participants: string[];  // Array of user IDs
  subject: string | null;
  project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Message
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  related_entity_id: string | null;
  related_entity_type: string | null;
  is_read: boolean;
  read_at: string | null;
  severity: string;
  action_required: boolean;
  action_url: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with relations (for joined queries)
export interface TaskWithAssignee extends Task {
  assignee?: Profile;
  project?: Project;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile?: Profile;
  project?: Project;
}

export interface ProjectWithMembers extends Project {
  members?: ProjectMemberWithProfile[];
  creator?: Profile;
}

export interface ExpenseWithProject extends Expense {
  project?: Project;
}

export interface ScheduleWithProject extends Schedule {
  project?: Project;
}

// Extended message types
export interface MessageWithSender extends Message {
  sender?: Profile;
}

export interface ConversationWithDetails extends Conversation {
  participants_profiles?: Profile[];  // Participant user profiles
  last_message?: Message;  // Most recent message
  unread_count?: number;  // Number of unread messages
  project?: Project;  // Related project if any
}

export interface NotificationWithProject extends Notification {
  project?: Project;
}

// Report
export interface Report {
  id: string;
  project_id: string;
  task_id: string | null;
  reported_by: string;
  content: string;
  accomplishment_date: string;
  accomplishment_time: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  is_manual: boolean;
  manual_description: string | null;
  created_at: string;
  updated_at: string;
}

// Report Comment
export interface ReportComment {
  id: string;
  report_id: string;
  commenter_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Extended report types
export interface ReportWithDetails extends Report {
  reporter?: Profile;
  project?: Project;
  task?: Task;
  comments?: ReportCommentWithProfile[];
}

export interface ReportCommentWithProfile extends ReportComment {
  commenter?: Profile;
}
