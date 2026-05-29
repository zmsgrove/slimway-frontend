import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './lib/ThemeContext'

import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import SchedulePage from './pages/schedule/SchedulePage'
import SettingsPage from './pages/settings/SettingsPage'
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage'
import LeadsPage from './pages/leads/LeadsPage'
import TasksPage from './pages/tasks/TasksPage'
import ChatPage from './pages/chat/ChatPage'
import EmployeesPage from './pages/employees/EmployeesPage'
import ScheduleWorkPage from './pages/schedule-work/SchedulePage'
import SalePage from './pages/sale/SalePage'
import WarehousePage from './pages/warehouse/WarehousePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 }
  }
})

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
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={user ? <AppLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="clients"       element={<ClientsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="schedule"      element={<SchedulePage />} />
            <Route path="leads"         element={<LeadsPage />} />
            <Route path="tasks"         element={<TasksPage />} />
            <Route path="chat"          element={<ChatPage />} />
            <Route path="employees"     element={<EmployeesPage />} />
            <Route path="schedule-work" element={<ScheduleWorkPage />} />
            <Route path="sale"          element={<SalePage />} />
            <Route path="warehouse"     element={<WarehousePage />} />
            <Route path="settings"      element={<SettingsPage />} />
          </Route>
          <Route
            path="*"
            element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
          />
        </Routes>
      </BrowserRouter>
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
