import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './lib/ThemeContext'
import { TooltipProvider } from './components/ui/tooltip'
import { ErrorBoundary } from './components/ErrorBoundary'

import AppLayout from './components/layout/AppLayout'

const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage      = lazy(() => import('./pages/dashboard/DashboardPage'))
const ClientsPage        = lazy(() => import('./pages/clients/ClientsPage'))
const SchedulePage       = lazy(() => import('./pages/schedule/SchedulePage'))
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'))
const SubscriptionsPage  = lazy(() => import('./pages/subscriptions/SubscriptionsPage'))
const LeadsPage          = lazy(() => import('./pages/leads/LeadsPage'))
const TasksPage          = lazy(() => import('./pages/tasks/TasksPage'))
const ChatPage           = lazy(() => import('./pages/chat/ChatPage'))
const EmployeesPage      = lazy(() => import('./pages/employees/EmployeesPage'))
const ScheduleWorkPage   = lazy(() => import('./pages/schedule-work/SchedulePage'))
const SalePage           = lazy(() => import('./pages/sale/SalePage'))
const WarehousePage      = lazy(() => import('./pages/warehouse/WarehousePage'))
const ManagementPage     = lazy(() => import('./pages/management/ManagementPage'))
const PayrollPage        = lazy(() => import('./pages/payroll/PayrollPage'))
const TimesheetPage      = lazy(() => import('./pages/timesheet/TimesheetPage'))
const ClientPortalPage   = lazy(() => import('./pages/client-portal/ClientPortalPage'))
const BookingPage        = lazy(() => import('./pages/book/BookingPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
})

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div
      className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
    />
  </div>
)

function InnerApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>
      </div>
    )
  }

  return (
    <ThemeProvider userId={user?.id ?? null}>
      <TooltipProvider delayDuration={400}>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no auth required */}
          <Route path="/client" element={
            <ErrorBoundary><Suspense fallback={<PageLoader />}><ClientPortalPage /></Suspense></ErrorBoundary>
          } />
          <Route path="/client/:token" element={
            <ErrorBoundary><Suspense fallback={<PageLoader />}><ClientPortalPage /></Suspense></ErrorBoundary>
          } />
          <Route path="/book/:slug" element={
            <ErrorBoundary><Suspense fallback={<PageLoader />}><BookingPage /></Suspense></ErrorBoundary>
          } />

          <Route path="/login" element={
            <ErrorBoundary><Suspense fallback={<PageLoader />}><LoginPage /></Suspense></ErrorBoundary>
          } />
          <Route
            path="/"
            element={user ? <AppLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><DashboardPage /></Suspense></ErrorBoundary>
            } />
            <Route path="clients" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><ClientsPage /></Suspense></ErrorBoundary>
            } />
            <Route path="subscriptions" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><SubscriptionsPage /></Suspense></ErrorBoundary>
            } />
            <Route path="schedule" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><SchedulePage /></Suspense></ErrorBoundary>
            } />
            <Route path="leads" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><LeadsPage /></Suspense></ErrorBoundary>
            } />
            <Route path="tasks" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><TasksPage /></Suspense></ErrorBoundary>
            } />
            <Route path="chat" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><ChatPage /></Suspense></ErrorBoundary>
            } />
            <Route path="employees" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><EmployeesPage /></Suspense></ErrorBoundary>
            } />
            <Route path="schedule-work" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><ScheduleWorkPage /></Suspense></ErrorBoundary>
            } />
            <Route path="sale" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><SalePage /></Suspense></ErrorBoundary>
            } />
            <Route path="warehouse" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><WarehousePage /></Suspense></ErrorBoundary>
            } />
            <Route path="settings" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></ErrorBoundary>
            } />
            <Route path="management" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><ManagementPage /></Suspense></ErrorBoundary>
            } />
            <Route path="payroll" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><PayrollPage /></Suspense></ErrorBoundary>
            } />
            <Route path="timesheet" element={
              <ErrorBoundary><Suspense fallback={<PageLoader />}><TimesheetPage /></Suspense></ErrorBoundary>
            } />
          </Route>
          <Route
            path="*"
            element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerApp />
    </QueryClientProvider>
  )
}
