export type Role = 'owner' | 'franchisee' | 'admin' | 'trainer'

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
