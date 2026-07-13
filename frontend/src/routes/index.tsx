import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import AssetsPage from '@/pages/assets/AssetsPage'
import AssetDetailPage from '@/pages/assets/AssetDetailPage'
import AssetCreatePage from '@/pages/assets/AssetCreatePage'
import AssetImportPage from '@/pages/assets/AssetImportPage'
import UsersPage from '@/pages/users/UsersPage'
import OnboardingPage from '@/pages/onboarding/OnboardingPage'
import OnboardingDetailPage from '@/pages/onboarding/OnboardingDetailPage'
import OnboardingCreatePage from '@/pages/onboarding/OnboardingCreatePage'
import AssignmentsPage from '@/pages/assignments/AssignmentsPage'
import MaintenancePage from '@/pages/maintenance/MaintenancePage'
import MyAssetsPage from '@/pages/assignments/MyAssetsPage'
import ProfilePage from '@/pages/auth/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({
  children,
  roles,
}: {
  children: React.ReactNode
  roles: string[]
}) {
  const { user } = useAuthStore()
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Assets — all roles with asset access */}
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/new" element={
          <RequireRole roles={['coo', 'it_head', 'it_team', 'management']}>
            <AssetCreatePage />
          </RequireRole>
        } />
        <Route path="/assets/import" element={
          <RequireRole roles={['coo', 'it_head', 'it_team']}>
            <AssetImportPage />
          </RequireRole>
        } />
        <Route path="/assets/:id" element={<AssetDetailPage />} />

        {/* Users — COO, HR, IT Head only */}
        <Route path="/users" element={
          <RequireRole roles={['coo', 'hr', 'it_head']}>
            <UsersPage />
          </RequireRole>
        } />

        {/* Onboarding — HR and COO */}
        <Route path="/onboarding" element={
          <RequireRole roles={['coo', 'hr', 'it_head', 'management']}>
            <OnboardingPage />
          </RequireRole>
        } />
        <Route path="/onboarding/new" element={
          <RequireRole roles={['coo', 'it_head', 'management']}>
            <OnboardingCreatePage />
          </RequireRole>
        } />
        <Route path="/onboarding/:id" element={
          <RequireRole roles={['coo', 'hr', 'it_head', 'management']}>
            <OnboardingDetailPage />
          </RequireRole>
        } />

        {/* Assignments */}
        <Route path="/assignments" element={
          <RequireRole roles={['coo', 'it_head', 'it_team', 'management']}>
            <AssignmentsPage />
          </RequireRole>
        } />
        <Route path="/my-assets" element={<MyAssetsPage />} />

        {/* Maintenance */}
        <Route path="/maintenance" element={
          <RequireRole roles={['coo', 'it_head', 'it_team', 'management']}>
            <MaintenancePage />
          </RequireRole>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}