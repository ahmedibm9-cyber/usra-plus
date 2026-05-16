// USRA PLUS - Super Admin Types (Full Business Control Mode)

export type AdminRole = 'super_admin' | 'support_admin' | 'analytics_admin' | 'billing_admin';

export type AdminPage = 
  | 'overview' 
  | 'users' 
  | 'families' 
  | 'features' 
  | 'activity'
  | 'subscriptions' 
  | 'subscription_otp'
  | 'infrastructure' 
  | 'sessions'
  | 'audit'
  | 'support' 
  | 'settings'
  | 'bugs'
  | 'moderation'
  | 'coupons'
  | 'referrals'
  | 'revenue'
  | 'campaigns'
  | 'content';

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
  trialUsers: number;
  trialConversionRate: number;
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
  status: 'active' | 'suspended' | 'flagged' | 'banned' | 'shadow_banned';
  lastLogin: string | null;
  createdAt: string;
  familyCount: number;
  language: string;
  country: string | null;
  isVip: boolean;
  betaTester: boolean;
  trustScore: number;
  fraudScore: number;
  trialStatus: 'none' | 'active' | 'expired' | 'converted';
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
  maxUsers: number;
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
  overrides?: FeatureFlagOverride[];
}

export interface FeatureFlagOverride {
  id: string;
  flagKey: string;
  targetType: 'user' | 'family' | 'plan' | 'beta';
  targetId: string;
  enabled: boolean;
  reason: string;
  createdAt: string;
  expiresAt?: string;
}

export interface PlanConfig {
  id: string;
  plan: string;
  price: number;
  monthlyPrice: number;
  yearlyPrice: number | null;
  lifetimePrice: number | null;
  currency: string;
  features: string[];
  limits: Record<string, number | null>;
  active: boolean;
  trialDays: number;
  isPopular: boolean;
  description: string;
  ctaText: string;
  regionalPricing: Record<string, number>;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'update' | 'promotion';
  active: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  targetAudience: string;
  ctaText?: string;
  ctaUrl?: string;
  banner?: boolean;
  priority?: number;
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

// Bug Detection System
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
export type BugSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type BugStatus = 'open' | 'investigating' | 'fixing' | 'resolved' | 'wontfix';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  latency?: number;
  lastChecked: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  source: string;
  errorType: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
}

export interface DatabaseTableStatus {
  tableName: string;
  exists: boolean;
  rowCount: number;
  hasRLS: boolean;
  lastChecked: string;
  category: 'core' | 'admin' | 'new' | 'business';
}

export interface ConnectionTest {
  name: string;
  type: 'supabase' | 'api' | 'storage' | 'realtime';
  status: 'pass' | 'fail' | 'warning';
  latency: number;
  message: string;
  lastTested: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Free Trial & Subscription Types
// ═══════════════════════════════════════════════════════════════

export type TrialStatus = 'active' | 'expired' | 'cancelled' | 'converted';

export interface UserTrial {
  id: string;
  userId: string;
  status: TrialStatus;
  startedAt: string;
  expiresAt: string;
  convertedAt: string | null;
  convertedToPlan: string | null;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  wasAbuseFlagged: boolean;
  createdAt: string;
}

export interface TrialMetrics {
  totalTrials: number;
  activeTrials: number;
  expiredTrials: number;
  convertedTrials: number;
  conversionRate: number;
  avgHoursToConvert: number;
  abuseFlagged: number;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: Trust, Safety, Fraud + Ban Types
// ═══════════════════════════════════════════════════════════════

export type BanType = 'warning' | 'temporary_suspension' | 'shadow_ban' | 'permanent_ban';
export type BanStatus = 'active' | 'appealed' | 'upheld' | 'revoked' | 'expired';

export interface UserBan {
  id: string;
  userId: string;
  banType: BanType;
  reason: string;
  details: Record<string, unknown>;
  status: BanStatus;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
  approvalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  appealText: string | null;
  appealSubmittedAt: string | null;
}

export type FraudAlertType = 
  | 'duplicate_trial' | 'suspicious_login' | 'payment_fraud'
  | 'api_abuse' | 'spam_detection' | 'harassment_pattern'
  | 'account_takeover' | 'credential_stuffing' | 'unusual_activity'
  | 'multiple_accounts' | 'geo_anomaly';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudStatus = 'open' | 'investigating' | 'resolved' | 'false_positive' | 'escalated';

export interface FraudAlert {
  id: string;
  userId: string | null;
  alertType: FraudAlertType;
  severity: FraudSeverity;
  status: FraudStatus;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  riskScore: number;
  autoAction: string | null;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export type AbuseReportType = 
  | 'harassment' | 'spam' | 'inappropriate_content' | 'fraud'
  | 'impersonation' | 'hate_speech' | 'threat' | 'other';

export type AbuseReportStatus = 'pending' | 'reviewing' | 'actioned' | 'dismissed' | 'escalated';

export interface AbuseReport {
  id: string;
  reporterId: string | null;
  reportedUserId: string | null;
  reportType: AbuseReportType;
  description: string;
  evidenceUrls: string[];
  status: AbuseReportStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string | null;
  actionTaken: string | null;
  createdAt: string;
}

export type ModerationItemType = 'ban_review' | 'abuse_report' | 'fraud_alert' | 'appeal' | 'content_flag';
export type ModerationStatus = 'pending' | 'in_progress' | 'resolved' | 'escalated';

export interface ModerationItem {
  id: string;
  itemType: ModerationItemType;
  itemId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: ModerationStatus;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface UserTrustScore {
  userId: string;
  trustScore: number;
  fraudScore: number;
  riskLevel: RiskLevel;
  factors: Record<string, number>;
  lastEvaluatedAt: string;
}

export interface ModerationDashboard {
  queueSummary: {
    total: number;
    pending: number;
    inProgress: number;
    urgent: number;
  };
  recentAlerts: FraudAlert[];
  recentBans: UserBan[];
  recentReports: AbuseReport[];
  trustDistribution: { riskLevel: RiskLevel; count: number }[];
}

// ═══════════════════════════════════════════════════════════════
// PHASE 5: Platform Intelligence Types
// ═══════════════════════════════════════════════════════════════

export type ErrorLogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type ErrorLogSource = 'server' | 'client' | 'api' | 'cron' | 'migration';

export interface ErrorLogEntry {
  id: string;
  level: ErrorLogLevel;
  source: ErrorLogSource;
  errorType: string;
  message: string;
  stackTrace: string | null;
  url: string | null;
  userId: string | null;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolved: boolean;
  createdAt: string;
}

export interface PerformanceMetricEntry {
  id: string;
  metricType: string;
  metricName: string;
  durationMs: number;
  status: 'success' | 'error' | 'timeout';
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// PHASE 6: Coupon, Referral, Revenue Types
// ═══════════════════════════════════════════════════════════════

export type CouponDiscountType = 'percentage' | 'fixed_amount' | 'free_trial_extension' | 'plan_upgrade';
export type CouponAudience = 'all' | 'new_users' | 'existing_users' | 'churned_users' | 'trial_users' | 'vip';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  applicablePlans: string[];
  maxRedemptions: number | null;
  currentRedemptions: number;
  maxRedemptionsPerUser: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  targetAudience: CouponAudience;
  autoApply: boolean;
  createdAt: string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  discountApplied: number;
  redeemedAt: string;
}

export type ReferralStatus = 'pending' | 'signed_up' | 'trial_started' | 'converted' | 'rewarded' | 'expired';
export type ReferralRewardType = 'trial_extension' | 'discount' | 'plan_upgrade' | 'credit';

export interface Referral {
  id: string;
  referrerId: string;
  referralCode: string;
  referredEmail: string | null;
  referredUserId: string | null;
  status: ReferralStatus;
  rewardType: ReferralRewardType;
  rewardValue: number;
  rewardClaimed: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface ReferralMetrics {
  totalReferrals: number;
  activeReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalRewardsGranted: number;
}

export type TransactionType = 'payment' | 'refund' | 'credit' | 'coupon' | 'trial' | 'upgrade' | 'downgrade';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed';

export interface RevenueTransaction {
  id: string;
  userId: string;
  subscriptionId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  originalAmount: number | null;
  discountAmount: number;
  couponId: string | null;
  paymentProvider: string | null;
  status: TransactionStatus;
  description: string | null;
  createdAt: string;
}

export type RefundStatus = 'pending' | 'approved' | 'processed' | 'rejected' | 'disputed';
export type RefundCategory = 'user_request' | 'technical_issue' | 'billing_error' | 'fraud' | 'goodwill' | 'other';

export interface Refund {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  category: RefundCategory;
  status: RefundStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  avgCLV: number;
  churnRate: number;
  monthlyRevenue: { month: string; revenue: number; newSubs: number; churned: number }[];
  revenueByPlan: { plan: string; revenue: number; percentage: number }[];
  refundRate: number;
  pendingRefunds: number;
}

export type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  bodyHtml?: string;
  targetSegment: string;
  status: EmailCampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdAt: string;
}

export interface ABTest {
  id: string;
  name: string;
  featureKey: string;
  variantA: string;
  variantB: string;
  trafficPercentage: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  targetSegment: string;
  startedAt: string | null;
  endedAt: string | null;
  winner: string | null;
  createdAt: string;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  rules: Record<string, unknown>;
  userCount: number;
  isAutoUpdate: boolean;
  lastUpdatedAt: string | null;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════
// System Controls
// ═══════════════════════════════════════════════════════════════

export interface SystemConfig {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updatedAt: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  messageEn: string;
  messageAr: string;
  createdAt: string;
}

export interface SystemStatus {
  maintenanceMode: boolean;
  emergencyShutdown: boolean;
  registrationEnabled: boolean;
  googleOAuthEnabled: boolean;
  activeAnnouncements: number;
  pendingModeration: number;
  unresolvedErrors: number;
  openFraudAlerts: number;
}
