import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const pageNames = {
  '/dashboard': 'داشبورد',
  '/users': 'مدیریت کاربران',
}

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const pageTitle =
    pageNames[location.pathname] ||
    (location.pathname.includes('/checklists')
      ? 'چک‌لیست‌های کاربر'
      : 'جزئیات چک‌لیست')

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')

  const role = String(user?.role || '').toLowerCase()

  const roleLabel =
    role === 'admin'
      ? 'ادمین'
      : role === 'manager'
        ? 'مدیر'
        : 'کاربر'

  return (
    <header className="app-header">
      <div className="header-page-name">
        <span className="header-mobile-mark">✓</span>
        <span>{pageTitle}</span>
      </div>

      <div className="header-user">
        <div className="header-avatar">
          {(displayName || user?.username || 'م').charAt(0)}
        </div>

        <div className="header-user-info">
          <strong>{displayName || user?.username || 'کاربر'}</strong>
          <span>{roleLabel}</span>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          خروج
        </button>
      </div>
    </header>
  )
}

export default Header