
import { NavLink } from 'react-router-dom'

const menuItems = [
  { to: '/dashboard', icon: '▦', label: 'داشبورد' },
  { to: '/users', icon: '♙', label: 'مدیریت کاربران' },
  { to: '/checklists', icon: '☷', label: 'مدیریت چک‌لیست‌ها' },
  { to: '/sites-map', icon: '⌖', label: 'نقشه سایت‌ها' },
  { to: '/audit-logs', icon: '◷', label: 'تاریخچه تغییرات' },
  { to: '/trash', icon: '🗑', label: 'سطل زباله' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">✓</div>

        <div>
          <strong>چک‌لیست</strong>
          <span>پنل مدیریت</span>
        </div>
      </div>

      <div className="sidebar-section-title">منوی اصلی</div>

      <nav className="sidebar-nav" aria-label="منوی اصلی">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' active' : ''}`
            }
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <span className="sidebar-bottom-dot" />
        <span>سامانه مدیریت بازدیدها</span>
      </div>
    </aside>
  )
}

export default Sidebar