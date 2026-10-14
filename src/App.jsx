
import { Navigate, Route, Routes } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserChecklistsPage from './pages/UserChecklistsPage'
import ChecklistDetailsPage from './pages/ChecklistDetailsPage'
import ChecklistsPage from './pages/ChecklistsPage'
import ChecklistsByTypePage from './pages/ChecklistsByTypePage'
import TrashPage from './pages/TrashPage'
import SitesMapPage from './pages/SitesMapPage'
import AuditLogsPage from './pages/AuditLogsPage'

import './App.css'

const managementRoles = ['manager', 'admin']

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={managementRoles} />
        }
      >
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/users"
            element={<UsersPage />}
          />

          <Route
            path="/users/:userId/checklists"
            element={<UserChecklistsPage />}
          />

          <Route
            path="/checklists/:checklistId"
            element={<ChecklistDetailsPage />}
          />

          <Route
            path="/checklists"
            element={<ChecklistsPage />}
          />

          <Route
            path="/checklists/type/:checklistTypeId"
            element={<ChecklistsByTypePage />}
          />

          <Route
            path="/trash"
            element={<TrashPage />}
          />

          <Route
            path="/sites-map"
            element={<SitesMapPage />}
          />

          <Route
            path="/audit-logs"
            element={<AuditLogsPage />}
          />

        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App
