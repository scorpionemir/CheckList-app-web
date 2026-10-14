
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { apiRequest } from '../services/api'
import PageTitle from '../components/common/PageTitle'
import LoadingState from '../components/common/LoadingState'

import './ChecklistsPage.css'

function getArray(result, keys = []) {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) {
      return result[key]
    }
  }

  return []
}

function isBrokenText(value) {
  return (
    typeof value === 'string' &&
    (/\?{2,}/.test(value) || value.includes('�'))
  )
}

function ChecklistsPage() {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadTypes() {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest('/api/checklist-types')

        const receivedTypes = getArray(result, [
          'checklistTypes',
          'checklist_types',
          'types',
        ])

        if (active) {
          setTypes(
            receivedTypes.filter(
              (type) =>
                type?.is_active !== false &&
                type?.isActive !== false
            )
          )
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
              'دریافت انواع چک‌لیست ناموفق بود.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadTypes()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="checklists-page" dir="rtl">
      <PageTitle
        title="چک‌لیست‌های بازدید"
        description="نوع چک‌لیست موردنظر را انتخاب کنید."
      />

      <div className="checklists-page-toolbar">
        <div className="checklists-page-toolbar-info">
          <strong>مدیریت چک‌لیست‌ها</strong>
          <span>
            مشاهده انواع چک‌لیست و دسترسی به موارد حذف‌شده
          </span>
        </div>

        <Link to="/trash" className="checklists-trash-link">
          <span aria-hidden="true">🗑️</span>
          سطل زباله
        </Link>
      </div>

      {loading && (
        <LoadingState
          message="در حال دریافت انواع چک‌لیست"
          description="لطفاً چند لحظه صبر کنید."
        />
      )}

      {!loading && error && (
        <div
          className="form-error checklist-page-message"
          role="alert"
        >
          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {!loading && !error && types.length === 0 && (
        <div className="content-panel empty-state checklist-page-message">
          <h3>نوع چک‌لیستی برای نمایش وجود ندارد.</h3>
          <p>
            اگر قبلاً نوع چک‌لیست ثبت کرده‌اید، پاسخ API را بررسی کنید.
          </p>
        </div>
      )}

      {!loading && !error && types.length > 0 && (
        <div className="quick-access-grid checklist-types-grid">
          {types.map((type) => {
            const name =
              type?.name ??
              type?.type_name ??
              type?.title ??
              'چک‌لیست بازدید'

            const description =
              !type?.description ||
              isBrokenText(type.description)
                ? 'مشاهده چک‌لیست‌های ثبت‌شده'
                : type.description

            return (
              <Link
                key={type.id}
                to={`/checklists/type/${encodeURIComponent(type.id)}`}
                className="quick-access-card checklist-type-link"
              >
                <span
                  className="quick-access-icon"
                  aria-hidden="true"
                >
                  ☷
                </span>

                <strong>{name}</strong>
                <span>{description}</span>

                <span className="checklist-type-link-action">
                  مشاهده چک‌لیست‌ها ←
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChecklistsPage
