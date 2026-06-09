export type Role = 'developer' | 'owner' | 'franchisee' | 'admin' | 'staff' | 'technical'

// ── Auth ────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  role: Role
  branchId: string | null
  fullName: string
}

// ── Branch ──────────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  city: string | null
  isFranchise: boolean
  createdAt: string
}

// ── Client (snake_case — matches DB/API response) ──────────
export interface Client {
  id: string
  branch_id: string
  full_name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  notes: string | null
  is_deleted?: boolean
  created_at: string
  status?: string | null
  avatar_url?: string | null
  tags?: string[] | null
  source?: string | null
  freeze_until?: string | null
  memberships?: ClientMembership[]
}

export interface ClientBookingSlot {
  id: string
  date: string
  time_start: string
  time_end: string
  device: { id: string; type: string; number: string } | null
}

export interface ClientBooking {
  id: string
  client_id: string
  subscription_id: string
  date: string
  attended: boolean | null
  created_at: string
  slot: ClientBookingSlot | null
}

export interface ClientDetail extends Client {
  subscriptions: Subscription[]
  bookings: ClientBooking[]
  lead_comments: LeadComment[]
}

export interface ClientMembership {
  id: string
  status: 'active' | 'frozen' | 'expired'
  end_date: string | null
  used_sessions: number
  total_sessions: number | null
}

// ── Old Membership (legacy v1.0, camelCase from index.ts) ─────
export interface Membership {
  id: string
  clientId: string
  branchId: string
  type: 'sessions' | 'unlimited' | 'period'
  totalSessions: number | null
  usedSessions: number
  startDate: string
  endDate: string | null
  price: number | null
  status: 'active' | 'frozen' | 'expired'
  createdAt: string
}

// ── Schedule (legacy v1.0) ────────────────────────────────
export interface ScheduleItem {
  id: string
  branchId: string
  trainerId: string | null
  title: string
  startsAt: string
  durationMin: number
  capacity: number
  createdAt: string
  profiles?: { fullName: string }
  bookings?: Booking[]
}

export interface Booking {
  id: string
  scheduleId: string
  clientId: string
  membershipId: string | null
  status: 'booked' | 'attended' | 'cancelled'
  createdAt: string
}

// ── v1.2.0 ───────────────────────────────────────────────────
export type DeviceType   = 'vacuactiv' | 'rollshape' | 'infrastep' | 'infrashape'
export type DeviceGroup  = 'A' | 'B'
export type DeviceStatus = 'active' | 'maintenance' | 'disabled'
export type SlotStatus   = 'free' | 'booked' | 'blocked' | 'maintenance'

export interface Device {
  id: string
  branch_id: string
  type: DeviceType
  number: string
  device_group: DeviceGroup
  status: DeviceStatus
  created_at: string
}

export interface Subscription {
  id: string
  client_id: string
  branch_id: string
  name: string
  slot_1_type: DeviceType
  slot_1_duration_min: number
  slot_1_sessions_total: number
  slot_1_sessions_left: number
  slot_2_type: DeviceType | null
  slot_2_duration_min: number | null
  slot_2_sessions_total: number | null
  slot_2_sessions_left: number | null
  slot_3_type: DeviceType | null
  slot_3_duration_min: number | null
  slot_3_sessions_total: number | null
  slot_3_sessions_left: number | null
  slot_3_device_id?: string | null
  slot_3_schedule_slot_id?: string | null
  slot_3_time_start?: string | null
  slot_3_weekday?: number | null
  slot_4_type: DeviceType | null
  slot_4_duration_min: number | null
  slot_4_sessions_total: number | null
  slot_4_sessions_left: number | null
  slot_4_device_id?: string | null
  slot_4_schedule_slot_id?: string | null
  slot_4_time_start?: string | null
  slot_4_weekday?: number | null
  is_trial: boolean
  finish_slot: number | null
  date_start: string
  date_end: string | null
  price: number | null
  status: 'active' | 'frozen' | 'expired' | 'cancelled'
  frozen_at: string | null
  frozen_until: string | null
  freeze_days_used: number | null
  cancellation_reason: string | null
  created_at: string
  deleted_at?: string | null
  clients?: { full_name: string; phone: string | null }
}

export interface SubscriptionRenewal {
  id: string
  subscription_id: string
  old_date_start: string | null
  old_date_end: string | null
  new_date_start: string | null
  new_date_end: string | null
  renewed_by: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

export interface ScheduleSlot {
  id: string
  branch_id: string
  device_id: string
  date: string
  time_start: string
  time_end: string
  status: SlotStatus
  booking_id: string | null
  created_at: string
  devices?: Device
  bookings_v2?: { attended: boolean | null } | null
}

// ── v1.3.0 Employees & Shifts ────────────────────────────────
export interface Employee {
  id: string
  branch_id: string
  profile_id: string | null
  full_name: string
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  phone: string | null
  birth_date: string | null
  position: string | null
  department: string | null
  address: string | null
  salary_rate?: number | null
  payment_type?: 'hourly' | 'fixed' | 'percent' | null
  base_salary?: number | null
  kpi_amount?: number | null
  sales_percent?: number | null
  created_at: string
  kpi?: {
    shifts_total: number
    shifts_completed: number
    tasks_total: number
    tasks_done: number
    avg_shift_hours: number
  }
}

export type ShiftStatus = 'scheduled' | 'active' | 'completed'

export interface ShiftCheckin {
  id: string
  shift_id: string
  employee_id: string
  branch_id: string
  checkin_at: string | null
  checkout_at: string | null
  is_own_shift: boolean
  location: string | null
  created_at: string
  checkin_type?: 'self' | 'replacement'
  replaces_employee_id?: string | null
  replacement_note?: string | null
}

export interface Shift {
  id: string
  branch_id: string
  employee_id: string
  date: string
  time_start: string
  time_end: string
  status: ShiftStatus
  created_at: string
  employees?: Employee
  shift_checkins?: ShiftCheckin[]
}

// ── v1.4.0 Leads ─────────────────────────────────────────────
export type LeadStatus = 'new' | 'in_work' | 'waiting' | 'success' | 'fail'
export type LeadSource = 'manual' | 'whatsapp' | 'instagram' | 'tiktok' | 'site' | 'tilda' | 'recommendation' | 'call' | 'other'

export interface LeadComment {
  id: string
  lead_id: string
  author_id: string | null
  text: string
  created_at: string
  profiles?: { full_name: string } | null
}

export interface Lead {
  id: string
  branch_id: string
  full_name: string
  phone: string | null
  source: LeadSource
  status: LeadStatus
  assigned_to: string | null
  assigned_profile?: { full_name: string } | null
  notes: string | null
  client_id: string | null
  created_by: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  status_changed_at: string | null
  desired_template_id: string | null
  fail_reason?: string | null
  lead_comments?: LeadComment[]
}

// ── Audit Log ────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string
  branch_id: string | null
  entity_type: string
  entity_id: string
  action: string
  actor_id: string | null
  actor_name: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// ── v1.5.0 ───────────────────────────────────────────────────
export type TaskStatus   = 'new' | 'today' | 'week' | 'long' | 'done' | 'closed' | 'pending_close'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskChecklistGroup {
  id: string
  task_id: string
  title: string
  position: number
  created_at: string
  items?: TaskChecklistItem[]
}

export interface TaskChecklistItem {
  id: string
  task_id: string
  group_id: string | null
  text: string
  is_done: boolean
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string | null
  text: string
  created_at: string
}

export interface Task {
  id: string
  branch_id: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  observer_ids: string[]
  created_by: string | null
  deadline: string | null
  created_at: string
  related_type?: string | null
  related_id?: string | null
  recur_rule?: 'daily' | 'weekly' | 'monthly' | null
  is_auto?: boolean
  task_checklist_items?: TaskChecklistItem[]
  task_checklist_groups?: TaskChecklistGroup[]
  task_comments?: TaskComment[]
}

export type WarehouseCategory = 'merch' | 'nutrition' | 'equipment' | 'other'
export type MovementType = 'in' | 'out'

export interface WarehouseItem {
  id: string
  branch_id: string
  name: string
  sku: string | null
  category: WarehouseCategory
  unit: string | null
  quantity: number
  min_quantity: number | null
  price: number | null
  low_stock?: boolean
  created_at: string
}

export interface WarehouseMovement {
  id: string
  item_id: string
  branch_id: string
  type: MovementType
  quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Department {
  id: string
  branch_id: string
  name: string
  created_at: string
}

export interface Position {
  id: string
  branch_id: string
  name: string
  created_at: string
}

export interface AnalyticsBranchRow {
  branch_id: string
  branch_name: string
  clients_total: number
  subscriptions_active: number
  leads_new: number
}

export interface AnalyticsOverview {
  clients_total: number
  subscriptions_active: number
  subscriptions_expiring_soon: number
  subscriptions_expiring_30d: number
  slots_today: number
  visits_today: number
  leads_new: number
  active_shifts: number
  low_stock_items: number
  by_branch?: AnalyticsBranchRow[]
  clients_by_month?: { month: string; count: number }[]
  revenue_by_month?: { month: string; revenue: number }[]
  leads_by_source?: { source: string; count: number }[]
  leads_funnel?: { status: string; count: number }[]
  leads_conversion?: number
  avg_ltv?: number
  visits_by_day?: number[]
  clients_by_day?: number[]
  revenue_by_day?: number[]
}

export interface Badges {
  leads_new: number
  tasks_overdue: number
  low_stock_items: number
  notifications_unread: number
  // dashboard metrics
  clients_total?: number
  clients_new_month?: number
  clients_new_prev_month?: number
  subscriptions_active?: number
  subscriptions_expiring_7d?: number
  subscriptions_sold_month?: number
  subscriptions_sold_prev_month?: number
  revenue_month?: number
  revenue_prev_month?: number
  visits_today?: number
  visits_yesterday?: number
  leads_total_month?: number
  leads_converted_month?: number
  tasks_my_today?: number
  employees_on_shift?: number
  schedule_slots_today?: number
  schedule_slots_booked_today?: number
  pending_bookings?: number
  visits_by_day?: number[]
  clients_by_day?: number[]
  revenue_by_day?: number[]
}

export type WidgetId =
  | 'clients_total' | 'subscriptions_active' | 'revenue_month' | 'visits_today'
  | 'leads_new' | 'subscriptions_expiring' | 'tasks_overdue' | 'low_stock'
  | 'leads_conversion' | 'employees_on_shift' | 'schedule_occupancy'
  | 'chart_clients' | 'chart_revenue' | 'chart_visits'
  | 'leads_funnel' | 'leads_sources'
  | 'birthdays' | 'schedule_today' | 'my_tasks' | 'recent_leads' | 'recent_clients'

export interface DashboardLayoutItem {
  i: string; x: number; y: number; w: number; h: number
  minW?: number; maxW?: number; minH?: number; maxH?: number
}

export interface DashboardLayoutData {
  layout: DashboardLayoutItem[]
  widgets: string[]
}

// ── v1.5.4 ───────────────────────────────────────────────────
export type CatalogCategory = 'merch' | 'nutrition' | 'equipment' | 'other'

export interface CatalogItem {
  id: string
  name: string
  sku: string | null
  category: CatalogCategory
  unit: string | null
  description: string | null
  price: number | null
  created_at: string
}

export interface Supplier {
  id: string
  branch_id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export interface SupplierOrderItem {
  id: string
  order_id: string
  item_name: string
  quantity: number
  unit_price: number | null
  created_at: string
}

export type SupplierOrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled'

export interface SupplierOrder {
  id: string
  branch_id: string
  supplier_id: string | null
  status: SupplierOrderStatus
  notes: string | null
  total_amount: number | null
  ordered_at: string
  delivered_at: string | null
  created_by: string | null
  created_at: string
  suppliers?: { id: string; name: string } | null
  supplier_order_items?: SupplierOrderItem[]
}

export interface BranchSubscriptionTemplate {
  id: string
  branch_id: string
  template_id: string
  created_at: string
  subscription_templates?: SubscriptionTemplate
}

// ── v1.2.1 ───────────────────────────────────────────────────
export interface SubscriptionTemplate {
  id: string
  branch_id: string | null
  name: string
  slot_1_type: DeviceType
  slot_1_duration_min: number
  slot_1_sessions_total: number
  slot_2_type: DeviceType | null
  slot_2_duration_min: number | null
  slot_2_sessions_total: number | null
  slot_3_type: DeviceType | null
  slot_3_duration_min: number | null
  slot_3_sessions_total: number | null
  slot_4_type: DeviceType | null
  slot_4_duration_min: number | null
  slot_4_sessions_total: number | null
  is_trial: boolean
  finish_slot: number | null
  validity_days: number
  price: number | null
  is_active: boolean
  created_at: string
}

// ── v1.6.x (migrations 023–029) ──────────────────────────────

export interface BookingV2 {
  id: string
  client_id: string
  subscription_id: string
  schedule_slot_id: string | null
  slot_2_schedule_slot_id?: string | null
  slot_3_schedule_slot_id?: string | null
  slot_4_schedule_slot_id?: string | null
  date: string
  attended: boolean | null
  status?: 'pending' | 'confirmed' | 'cancelled'
  confirmed_by?: string | null
  confirmed_at?: string | null
  created_at: string
}

export interface PromoCode {
  id: string
  branch_id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  max_uses: number | null
  max_uses_per_client?: number | null
  uses_count: number
  expires_at?: string | null
  is_active: boolean
  created_at: string
}

export interface PromoCodeUsage {
  id: string
  promo_code_id: string
  client_id: string
  branch_id: string
  used_at: string
}

export interface BranchSettings {
  work_time_start: string | null
  work_time_end: string | null
  timezone: string | null
  currency: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  address: string | null
  booking_interval_min: number | null
  max_bookings_per_day: number | null
  allow_cancel_within_24h?: boolean
}

export interface ApiKey {
  id: string
  branch_id: string
  name: string
  key_prefix: string
  raw_key?: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  created_by: string
  created_at: string
}

export interface WebhookEndpoint {
  id: string
  branch_id: string
  url: string
  events: string[]
  is_active: boolean
  secret?: string
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  webhook_endpoint_id: string
  event: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt: number
  created_at: string
}

export interface Notification {
  id: string
  profile_id: string
  branch_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}
