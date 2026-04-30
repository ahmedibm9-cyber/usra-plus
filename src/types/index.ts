// USRA PLUS - Core Types

export type AppPage = 'dashboard' | 'tasks' | 'calendar' | 'grocery' | 'chat' | 'files' | 'settings';
export type AuthView = 'login' | 'signup' | 'forgot-password' | 'verify-email';
export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export type FamilyRole = 'owner' | 'admin' | 'member';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type SubscriptionPlan = 'free' | 'pro' | 'family_plus';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country_code: string | null;
  avatar_url: string | null;
  language: Language;
  theme: Theme;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  nickname: string | null;
  joined_at: string;
  profiles?: UserProfile;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: UserProfile;
  creator?: UserProfile;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  color: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: UserProfile;
}

export interface GroceryItem {
  id: string;
  family_id: string;
  name: string;
  category: string | null;
  quantity: number;
  checked: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
  adder?: UserProfile;
}

export interface ChatMessage {
  id: string;
  family_id: string;
  content: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to: string | null;
  created_at: string;
  sender?: UserProfile;
}

export interface FamilyFile {
  id: string;
  family_id: string;
  name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: UserProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  family_id: string | null;
  title: string;
  message: string;
  type: 'task' | 'calendar' | 'grocery' | 'chat' | 'family' | 'system';
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  revenuecat_id: string | null;
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  familyMembers: number;
  upcomingEvents: number;
  groceryItems: number;
  groceryChecked: number;
  completionRate: number;
  productivityScore: number;
}
