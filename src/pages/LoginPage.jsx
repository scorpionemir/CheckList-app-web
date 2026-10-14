import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'

import { useAuth } from '../context/AuthContext'

import LoadingState from '../components/common/LoadingState'

const loginSchema = Yup.object({
  username: Yup.string().required('نام کاربری را وارد کنید'),
  password: Yup.string().required('رمز عبور را وارد کنید'),
})

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const { login, user, loading, logout } = useAuth()
  const navigate = useNavigate()
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

  if (user) {
    const role = String(user.role || '').toLowerCase()

    if (['manager', 'admin'].includes(role)) {
      return <Navigate to="/dashboard" replace />
    }

    return (
  <div className="login-page" dir="rtl">
    <div className="form-error" role="alert">
      حساب شما اجازهٔ ورود به پنل وب را ندارد.
    </div>
  </div>
)
  }

  async function handleLogin(values, { setSubmitting }) {
    setServerError('')

    try {
      const currentUser = await login(values)
      const role = String(currentUser?.role || '').toLowerCase()

      if (!['manager', 'admin'].includes(role)) {
        if (typeof logout === 'function') {
          await logout()
        }

        setServerError('این حساب اجازهٔ ورود به پنل وب را ندارد.')
        return
      }

      const requestedPath = location.state?.from
      const safePath =
        typeof requestedPath === 'string' &&
        requestedPath.startsWith('/') &&
        !requestedPath.startsWith('//') &&
        !requestedPath.startsWith('/login')
          ? requestedPath
          : '/dashboard'

      navigate(safePath, { replace: true })
    } catch (error) {
      setServerError(error.message || 'ورود ناموفق بود.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page" dir="rtl">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-icon" aria-hidden="true">✓</div>
          <h1>پنل مدیریت چک‌لیست</h1>
          <p>سامانه مدیریت کاربران و بازدیدهای دوره‌ای</p>
        </div>

        <div className="login-heading">
          <h2>ورود به حساب کاربری</h2>
          <p>برای ادامه، اطلاعات حساب خود را وارد کنید.</p>
        </div>

        <Formik
          initialValues={{ username: '', password: '' }}
          validationSchema={loginSchema}
          onSubmit={handleLogin}
        >
          {({ isSubmitting }) => (
            <Form className="login-form">
              <div className="form-group">
                <label htmlFor="username">نام کاربری</label>
                <Field
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="نام کاربری خود را وارد کنید"
                  className="form-input"
                />
                <ErrorMessage
                  name="username"
                  component="span"
                  className="field-error"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">رمز عبور</label>

                <div className="password-wrapper">
                  <Field
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="رمز عبور خود را وارد کنید"
                    className="form-input"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(value => !value)}
                    aria-label={
                      showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'
                    }
                  >
                    {showPassword ? 'پنهان کردن' : 'نمایش'}
                  </button>
                </div>

                <ErrorMessage
                  name="password"
                  component="span"
                  className="field-error"
                />
              </div>

              {serverError && (
                <div className="form-error" role="alert">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'در حال ورود...' : 'ورود به پنل'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="login-footer">
          <span className="status-dot" />
          <span>پنل مدیریت سامانه چک‌لیست</span>
        </div>
      </section>

      <footer className="page-footer">
        سامانه مدیریت و پیگیری چک‌لیست‌های بازدید
      </footer>
    </main>
  )
}

export default LoginPage