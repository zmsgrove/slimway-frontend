export type Role = 'developer' | 'owner' | 'franchisee' | 'admin' | 'trainer' | 'staff' | 'technical'

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
  memberships?: ClientMembership[]
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
  date_start: string
  date_end: string | null
  price: number | null
  status: 'active' | 'frozen' | 'expired' | 'cancelled'
  created_at: string
  clients?: { full_name: string; phone: string | null }
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
  created_at: string
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
export type LeadSource = 'manual' | 'whatsapp'

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
  notes: string | null
  client_id: string | null
  created_by: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
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
  validity_days: number
  price: number | null
  is_active: boolean
  created_at: string
}
