export type Role = 'owner' | 'franchisee' | 'admin' | 'trainer'

// ── v1.2.0 ──────────────────────────────────────────────────
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

export interface User {
  id: string
  email: string
  role: Role
  branchId: string | null
  fullName: string
}

export interface Branch {
  id: string
  name: string
  city: string | null
  isFranchise: boolean
  createdAt: string
}

export interface Client {
  id: string
  branchId: string
  fullName: string
  phone: string | null
  email: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  memberships?: Membership[]
}

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
