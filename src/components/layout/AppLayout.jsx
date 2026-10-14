
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function AppLayout() {
  return (
    <div className="app-layout" dir="rtl">
      <Sidebar />

      <div className="app-main">
        <Header />

        <main className="app-content">
          <Outlet />
        </main>

        <footer className="app-footer">
          سامانه مدیریت و پیگیری چک‌لیست‌های بازدید
        </footer>
      </div>
    </div>
  )
}

export default AppLayout