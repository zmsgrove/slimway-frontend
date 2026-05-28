export type Role = 'owner' | 'franchisee' | 'admin' | 'trainer'

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
  status: 'active' | 'frozen' | 'expired'
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
  phone: string | null
  birth_date: string | null
  position: string | null
  department: string | null
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

// ── v1.2.1 ───────────────────────────────────────────────────
export interface SubscriptionTemplate {
  id: string
  branch_id: string
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
