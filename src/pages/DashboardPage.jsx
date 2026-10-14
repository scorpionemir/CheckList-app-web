import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import './DashboardPage.css'

function getArray(response, keys = []) {
  if (Array.isArray(response)) return response

  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key]
    }
  }

  return []
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getTypeName(checklist, types) {
  const type = types.find(
    (item) =>
      String(item.id) === String(checklist.checklist_type_id),
  )

  return (
    type?.name ||
    type?.title ||
    type?.type_name ||
    'نوع نامشخص'
  )
}

function getStatusName(status) {
  const statuses = {
    submitted: 'ثبت‌شده',
    draft: 'پیش‌نویس',
    pending: 'در انتظار بررسی',
    approved: 'تأییدشده',
    rejected: 'ردشده',
    removed: 'حذف‌شده',
  }

  return statuses[status] || status || 'نامشخص'
}

function DashboardPage() {
  const [checklists, setChecklists] = useState([])
  const [checklistTypes, setChecklistTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [checklistsResponse, typesResponse] =
          await Promise.all([
            apiRequest('/api/checklists/manager/all'),
            apiRequest('/api/checklist-types'),
          ])

        if (cancelled) return

        setChecklists(
          getArray(checklistsResponse, [
            'checklists',
            'data',
            'items',
          ]),
        )

        setChecklistTypes(
          getArray(typesResponse, [
            'checklistTypes',
            'checklist_types',
            'types',
            'data',
          ]),
        )
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              'دریافت اطلاعات داشبورد با خطا مواجه شد.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const statistics = useMemo(() => {
    const activeChecklists = checklists.filter(
      (item) => item.status !== 'removed',
    )

    const statusCounts = activeChecklists.reduce(
      (result, item) => {
        const status = item.status || 'unknown'
        result[status] = (result[status] || 0) + 1
        return result
      },
      {},
    )

    const byType = checklistTypes.map((type) => ({
      id: type.id,
      name: type.name || type.title || type.type_name || 'بدون نام',
      count: activeChecklists.filter(
        (item) =>
          String(item.checklist_type_id) === String(type.id),
      ).length,
    }))

    const latest = [...activeChecklists]
      .sort((a, b) => {
        const dateA = new Date(
          a.created_at || a.updated_at || a.checklist_date || 0,
        ).getTime()

        const dateB = new Date(
          b.created_at || b.updated_at || b.checklist_date || 0,
        ).getTime()

        return dateB - dateA
      })
      .slice(0, 6)

    return {
      total: activeChecklists.length,
      submitted: statusCounts.submitted || 0,
      pending: statusCounts.pending || 0,
      byType,
      latest,
    }
  }, [checklists, checklistTypes])

  if (loading) {
    return (
      <div className="page-container dashboard-page" dir="rtl">
        <h1>داشبورد</h1>
        <div className="dashboard-message">
          در حال دریافت اطلاعات...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container dashboard-page" dir="rtl">
        <h1>داشبورد</h1>

        <div className="dashboard-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container dashboard-page" dir="rtl">
      <div className="dashboard-heading">
        <div>
          <h1>داشبورد مدیریت</h1>
          <p>
            نمای کلی چک‌لیست‌ها و آخرین بازدیدهای ثبت‌شده
          </p>
        </div>

        <Link to="/checklists" className="dashboard-primary-link">
          مشاهده همه چک‌لیست‌ها
        </Link>
      </div>

      <section
        className="dashboard-statistics"
        aria-label="آمار چک‌لیست‌ها"
      >
        <article className="dashboard-stat-card">
          <span>کل چک‌لیست‌های فعال</span>
          <strong>{statistics.total}</strong>
        </article>

        <article className="dashboard-stat-card">
          <span>چک‌لیست‌های ثبت‌شده</span>
          <strong>{statistics.submitted}</strong>
        </article>

        <article className="dashboard-stat-card">
          <span>در انتظار بررسی</span>
          <strong>{statistics.pending}</strong>
        </article>

        <article className="dashboard-stat-card">
          <span>انواع چک‌لیست</span>
          <strong>{checklistTypes.length}</strong>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <h2>آمار بر اساس نوع چک‌لیست</h2>
          <Link to="/checklists">مشاهده انواع</Link>
        </div>

        {statistics.byType.length === 0 ? (
          <p className="dashboard-empty">
            نوعی برای نمایش وجود ندارد.
          </p>
        ) : (
          <div className="dashboard-type-list">
            {statistics.byType.map((type) => {
              const percentage =
                statistics.total > 0
                  ? Math.round(
                      (type.count / statistics.total) * 100,
                    )
                  : 0

              return (
                <div
                  className="dashboard-type-row"
                  key={type.id}
                >
                  <div className="dashboard-type-info">
                    <span>{type.name}</span>
                    <strong>{type.count}</strong>
                  </div>

                  <div
                    className="dashboard-progress-track"
                    role="progressbar"
                    aria-label={`تعداد ${type.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage}
                  >
                    <div
                      className="dashboard-progress-value"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <h2>آخرین چک‌لیست‌ها</h2>
          <Link to="/checklists">مشاهده همه</Link>
        </div>

        {statistics.latest.length === 0 ? (
          <p className="dashboard-empty">
            هنوز چک‌لیستی برای نمایش وجود ندارد.
          </p>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>نام سایت</th>
                  <th>نوع چک‌لیست</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                  <th>جزئیات</th>
                </tr>
              </thead>

              <tbody>
                {statistics.latest.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.site_name || 'بدون نام'}
                    </td>

                    <td>
                      {getTypeName(item, checklistTypes)}
                    </td>

                    <td>
                      {formatDate(
                        item.checklist_date || item.created_at,
                      )}
                    </td>

                    <td>
                      <span
                        className={`dashboard-status dashboard-status-${item.status || 'unknown'}`}
                      >
                        {getStatusName(item.status)}
                      </span>
                    </td>

                    <td>
                      <Link
                        to={`/checklists/${encodeURIComponent(item.id)}`}
                        className="dashboard-details-link"
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPage