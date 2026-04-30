// USRA PLUS - Super Admin Types

export type AdminRole = 'super_admin' | 'support_admin' | 'analytics_admin' | 'billing_admin';

export type AdminPage = 
  | 'overview' 
  | 'users' 
  | 'families' 
  | 'features' 
  | 'subscriptions' 
  | 'infrastructure' 
  | 'support' 
  | 'settings';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  name: string;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Platform Overview Metrics
export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  totalFamilies: number;
  activeFamilies: number;
  newRegistrations: number;
  churnRate: number;
  upgradeRate: number;
  revenueMRR: number;
  revenueARR: number;
  freeUsers: number;
  paidUsers: number;
  serverHealth: number;
  dbUsage: number;
  storageUsage: number;
  errorRate: number;
  realtimeBandwidth: number;
}

export interface RegionalDistribution {
  region: string;
  users: number;
  percentage: number;
}

export interface LanguageUsage {
  language: string;
  users: number;
  percentage: number;
}

export interface DeviceBreakdown {
  device: string;
  users: number;
  percentage: number;
}

// User Analytics
export interface UserMetrics {
  registrations: TimeSeriesPoint[];
  loginFrequency: TimeSeriesPoint[];
  avgSessionDuration: number;
  retentionRate: number;
  userLifecycleStages: Record<string, number>;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: string;
  status: 'active' | 'suspended' | 'flagged';
  lastLogin: string | null;
  createdAt: string;
  familyCount: number;
  language: string;
  country: string | null;
}

// Family Analytics
export interface FamilyMetrics {
  totalFamilies: number;
  avgFamilySize: number;
  taskActivity: TimeSeriesPoint[];
  groceryActivity: TimeSeriesPoint[];
  calendarActivity: TimeSeriesPoint[];
  chatActivity: TimeSeriesPoint[];
  familyRetention: number;
  inviteConversionRate: number;
  moduleUsage: ModuleUsage[];
}

export interface ModuleUsage {
  module: string;
  usage: number;
  percentage: number;
}

// Feature Usage
export interface FeatureUsageData {
  feature: string;
  totalUsage: number;
  dailyAvg: number;
  weeklyTrend: number;
  adoptionRate: number;
  dropOffRate: number;
}

export interface FeatureFunnel {
  step: string;
  count: number;
  percentage: number;
  dropOff: number;
}

// Subscription & Revenue
export interface SubscriptionMetrics {
  freeUsers: number;
  proUsers: number;
  familyPlusUsers: number;
  lifetimeUsers: number;
  trialUsers: number;
  monthlyRevenue: number;
  annualRevenue: number;
  failedPayments: number;
  refunds: number;
  avgCLV: number;
  conversionRate: number;
  churnRate: number;
  downgradeRate: number;
}

export interface RevenueTimeSeries {
  date: string;
  revenue: number;
  newSubscriptions: number;
  churned: number;
}

// Infrastructure
export interface InfrastructureMetrics {
  dbSize: number;
  dbGrowth: number;
  storageSize: number;
  storageGrowth: number;
  apiRequestVolume: number;
  errorRate: number;
  avgResponseTime: number;
  uptime: number;
  activeConnections: number;
  securityAlerts: number;
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'warning' | 'critical';
  message: string;
  source: string;
  count: number;
  lastOccurrence: string;
  stack?: string;
}

// Support
export interface SupportMetrics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  npsScore: number;
  commonIssues: IssueCount[];
  featureRequests: IssueCount[];
}

export interface IssueCount {
  issue: string;
  count: number;
  percentage: number;
}

// System Settings
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetPlan: string | null;
  createdAt: string;
}

export interface PlanConfig {
  id: string;
  plan: string;
  price: number;
  features: string[];
  limits: Record<string, number | null>;
  active: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  active: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

// Shared
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DateRange {
  from: string;
  to: string;
}
