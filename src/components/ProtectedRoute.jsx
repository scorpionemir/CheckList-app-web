import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import LoadingState from '../components/common/LoadingState'

function ProtectedRoute({ allowedRoles }) {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) {
  return (
    <div dir="rtl">
      <LoadingState
        fullPage
        message="در حال بررسی وضعیت ورود"
        description="لطفاً چند لحظه صبر کنید."
      />
    </div>
  )
}

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  const role = String(user.role || '').toLowerCase()

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (typeof logout === 'function') {
      logout()
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ accessDenied: true }}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute