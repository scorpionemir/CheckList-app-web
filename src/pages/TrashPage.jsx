
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import PageTitle from '../components/common/PageTitle'
import LoadingState from '../components/common/LoadingState'
import { apiRequest } from '../services/api'

function getArray(result, keys = []) {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) {
      return result[key]
    }
  }

  return []
}

function formatDate(value) {
  if (!value) return '—'

  const rawValue = String(value)

  // جلوگیری از تغییر روز برای تاریخ‌هایی مانند YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    return date.toLocaleDateString('fa-IR')
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return rawValue
  }

  return date.toLocaleDateString('fa-IR')
}

function getContractorName(item) {
  const fullName = [
    item.contractor_first_name,
    item.contractor_last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || item.contractor_username || '—'
}

export default function TrashPage() {
  const [deletedChecklists, setDeletedChecklists] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [restoringId, setRestoringId] = useState(null)

  const loadTrash = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/checklists/trash')
      const items = getArray(result, ['checklists'])

      setDeletedChecklists(items)
    } catch (err) {
      setError(
        err?.message ||
          'دریافت چک‌لیست‌های سطل زباله ناموفق بود.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const checklistTypes = useMemo(() => {
    return [
      ...new Set(
        deletedChecklists
          .map((item) => item.checklist_type_name)
          .filter(Boolean)
      ),
    ]
  }, [deletedChecklists])

  const filteredChecklists = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fa')

    return deletedChecklists.filter((item) => {
      const matchesType =
        typeFilter === 'all' ||
        item.checklist_type_name === typeFilter

      const searchableText = [
        item.site_name,
        getContractorName(item),
        item.checklist_type_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fa')

      return matchesType && searchableText.includes(query)
    })
  }, [deletedChecklists, search, typeFilter])

  async function handleRestore(item) {
    const checklistId = item?.id

    if (!checklistId) {
      setError('شناسهٔ چک‌لیست معتبر نیست.')
      return
    }

    const confirmed = window.confirm(
      `آیا می‌خواهی چک‌لیست «${item.site_name || 'بدون نام'}» را بازیابی کنی؟\n\nاین چک‌لیست دوباره در فهرست اصلی نمایش داده خواهد شد.`
    )

    if (!confirmed) return

    setRestoringId(checklistId)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/checklists/${encodeURIComponent(checklistId)}/restore`,
        { method: 'PATCH' }
      )

      setDeletedChecklists((current) =>
        current.filter(
          (checklist) =>
            String(checklist.id) !== String(checklistId)
        )
      )

      setNotice('چک‌لیست با موفقیت بازیابی شد.')
    } catch (err) {
      setError(
        err?.message ||
          'بازیابی چک‌لیست ناموفق بود. لطفاً دوباره تلاش کن.'
      )
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <main className="page-container trash-page" dir="rtl">
      <PageTitle title="سطل زباله چک‌لیست‌ها" />

      <section className="trash-intro">
        <div className="trash-intro-icon" aria-hidden="true">
          🗑️
        </div>

        <div className="trash-intro-content">
          <h2>چک‌لیست‌های حذف‌شده</h2>

          <p>
            چک‌لیست‌های انتقال‌یافته به سطل زباله در این بخش
            نمایش داده می‌شوند. می‌توانی آن‌ها را بازیابی کنی.
          </p>

          <span className="trash-demo-label">
            مدیریت اطلاعات ذخیره‌شده در سرور
          </span>
        </div>
      </section>

      <section className="trash-summary-grid">
        <article className="trash-summary-card">
          <span>تعداد چک‌لیست‌های سطل زباله</span>
          <strong>{deletedChecklists.length}</strong>
        </article>

        <article className="trash-summary-card">
          <span>تعداد نتایج فیلترشده</span>
          <strong>{filteredChecklists.length}</strong>
        </article>
      </section>

      <section className="content-panel trash-list-panel">
        <div className="trash-panel-heading">
          <div>
            <h2>فهرست چک‌لیست‌ها</h2>
            <p>
              چک‌لیست موردنظر را جست‌وجو یا بر اساس نوع فیلتر کن.
            </p>
          </div>

          <Link to="/checklists" className="secondary-button">
            بازگشت به چک‌لیست‌ها
          </Link>
        </div>

        <div className="trash-toolbar">
          <div className="trash-search-field">
            <label htmlFor="trash-search">جست‌وجو</label>

            <input
              id="trash-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="نام سایت، پیمانکار یا نوع چک‌لیست..."
            />
          </div>

          <div className="trash-filter-field">
            <label htmlFor="trash-type-filter">نوع چک‌لیست</label>

            <select
              id="trash-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">همه انواع</option>

              {checklistTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch('')
              setTypeFilter('all')
              setNotice('')
              setError('')
            }}
          >
            پاک کردن فیلترها
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={loadTrash}
            disabled={loading || restoringId !== null}
          >
            {loading ? 'در حال دریافت...' : 'تازه‌سازی فهرست'}
          </button>
        </div>

        {notice && (
          <div className="trash-notice" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="form-error" role="alert">
            <p>{error}</p>

            <button
              type="button"
              className="secondary-button"
              onClick={loadTrash}
              disabled={loading}
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState
            message="در حال دریافت چک‌لیست‌های حذف‌شده"
            description="لطفاً چند لحظه صبر کن."
          />
        ) : !error && filteredChecklists.length === 0 ? (
          <div className="trash-empty-state">
            <div aria-hidden="true">📂</div>
            <h3>
              {deletedChecklists.length === 0
                ? 'سطل زباله خالی است'
                : 'چک‌لیستی پیدا نشد'}
            </h3>
            <p>
              {deletedChecklists.length === 0
                ? 'چک‌لیست‌های انتقال‌یافته به سطل زباله در اینجا نمایش داده می‌شوند.'
                : 'عبارت جست‌وجو یا فیلتر نوع چک‌لیست را تغییر بده.'}
            </p>
          </div>
        ) : !error ? (
          <div className="table-responsive trash-table-wrapper">
            <table className="data-table trash-table">
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>نام سایت</th>
                  <th>پیمانکار</th>
                  <th>نوع چک‌لیست</th>
                  <th>تاریخ چک‌لیست</th>
                  <th>تاریخ حذف</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredChecklists.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.site_name || '—'}</td>
                    <td>{getContractorName(item)}</td>
                    <td>{item.checklist_type_name || '—'}</td>
                    <td>{formatDate(item.checklist_date)}</td>
                    <td>{formatDate(item.deleted_at)}</td>

                    <td>
                      <span className="trash-status">
                        حذف‌شده
                      </span>
                    </td>

                    <td>
                      <div className="trash-row-actions">
                        <button
                          type="button"
                          className="trash-restore-button"
                          onClick={() => handleRestore(item)}
                          disabled={restoringId !== null}
                        >
                          {String(restoringId) === String(item.id)
                            ? 'در حال بازیابی...'
                            : 'بازیابی'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  )
}
