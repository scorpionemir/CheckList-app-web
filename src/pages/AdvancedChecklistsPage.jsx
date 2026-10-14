import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import './AdvancedChecklistsPage.css'

function getArray(response, keys = []) {
  if (Array.isArray(response)) return response

  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key]
    }
  }

  return []
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

function getDateValue(item) {
  const value =
    item.checklist_date ||
    item.created_at ||
    item.updated_at

  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  // قالب تاریخ میلادی برای مقایسه با input type="date"
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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

function getSiteName(item) {
  return (
    item.site_name ||
    item.siteName ||
    item.location_name ||
    item.title ||
    'بدون نام'
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

const initialFilters = {
  search: '',
  typeId: '',
  status: '',
  fromDate: '',
  toDate: '',
}

function AdvancedChecklistsPage() {
  const [checklists, setChecklists] = useState([])
  const [types, setTypes] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadData() {
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

        setTypes(
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
              'دریافت چک‌لیست‌ها با خطا مواجه شد.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const filteredChecklists = useMemo(() => {
    const searchText = filters.search.trim().toLocaleLowerCase()

    return checklists
      .filter((item) => {
        // چک‌لیست‌های حذف‌شده در این صفحه نمایش داده نمی‌شوند.
        if (item.status === 'removed') return false

        if (
          filters.typeId &&
          String(item.checklist_type_id) !== String(filters.typeId)
        ) {
          return false
        }

        if (
          filters.status &&
          String(item.status || '') !== filters.status
        ) {
          return false
        }

        const date = getDateValue(item)

        if (filters.fromDate && (!date || date < filters.fromDate)) {
          return false
        }

        if (filters.toDate && (!date || date > filters.toDate)) {
          return false
        }

        if (searchText) {
          const searchableText = [
            getSiteName(item),
            item.id,
            item.status,
            item.user_name,
            item.contractor_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()

          if (!searchableText.includes(searchText)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        return getDateValue(b).localeCompare(getDateValue(a))
      })
  }, [checklists, filters])

  function resetFilters() {
    setFilters(initialFilters)
  }

  return (
    <div
      className="page-container advanced-checklists-page"
      dir="rtl"
    >
      <div className="advanced-checklists-heading">
        <div>
          <h1>جست‌وجوی پیشرفته چک‌لیست‌ها</h1>
          <p>
            جست‌وجو بر اساس سایت، نوع چک‌لیست، وضعیت و تاریخ
          </p>
        </div>

        <Link to="/checklists" className="advanced-back-link">
          بازگشت به انواع چک‌لیست‌ها
        </Link>
      </div>

      <section className="advanced-filter-panel">
        <div className="advanced-filter-grid">
          <div className="advanced-filter-field">
            <label htmlFor="checklist-search">
              نام سایت، شناسه یا نام کاربر
            </label>
            <input
              id="checklist-search"
              type="search"
              value={filters.search}
              onChange={(event) =>
                updateFilter('search', event.target.value)
              }
              placeholder="عبارت موردنظر را وارد کن..."
            />
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="checklist-type-filter">
              نوع چک‌لیست
            </label>
            <select
              id="checklist-type-filter"
              value={filters.typeId}
              onChange={(event) =>
                updateFilter('typeId', event.target.value)
              }
            >
              <option value="">همه انواع</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name || type.title || type.type_name || type.id}
                </option>
              ))}
            </select>
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="checklist-status-filter">
              وضعیت
            </label>
            <select
              id="checklist-status-filter"
              value={filters.status}
              onChange={(event) =>
                updateFilter('status', event.target.value)
              }
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="submitted">ثبت‌شده</option>
              <option value="draft">پیش‌نویس</option>
              <option value="pending">در انتظار بررسی</option>
              <option value="approved">تأییدشده</option>
              <option value="rejected">ردشده</option>
            </select>
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="checklist-from-date">
              از تاریخ
            </label>
            <input
              id="checklist-from-date"
              type="date"
              value={filters.fromDate}
              max={filters.toDate || undefined}
              onChange={(event) =>
                updateFilter('fromDate', event.target.value)
              }
            />
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="checklist-to-date">
              تا تاریخ
            </label>
            <input
              id="checklist-to-date"
              type="date"
              value={filters.toDate}
              min={filters.fromDate || undefined}
              onChange={(event) =>
                updateFilter('toDate', event.target.value)
              }
            />
          </div>
        </div>

        <div className="advanced-filter-actions">
          <span>
            تعداد نتایج: <strong>{filteredChecklists.length}</strong>
          </span>

          <button type="button" onClick={resetFilters}>
            پاک کردن فیلترها
          </button>
        </div>
      </section>

      {loading ? (
        <div className="advanced-table-message">
          در حال دریافت اطلاعات...
        </div>
      ) : error ? (
        <div className="advanced-table-error" role="alert">
          {error}
        </div>
      ) : filteredChecklists.length === 0 ? (
        <div className="advanced-table-message">
          چک‌لیستی با این شرایط پیدا نشد.
        </div>
      ) : (
        <section className="advanced-table-panel">
          <div className="advanced-table-wrapper">
            <table className="advanced-checklists-table">
              <thead>
                <tr>
                  <th>نام سایت</th>
                  <th>نوع چک‌لیست</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                  <th>شناسه</th>
                  <th>جزئیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredChecklists.map((item) => (
                  <tr key={item.id}>
                    <td>{getSiteName(item)}</td>
                    <td>{getTypeName(item, types)}</td>
                    <td>
                      {formatDate(
                        item.checklist_date || item.created_at,
                      )}
                    </td>
                    <td>{getStatusName(item.status)}</td>
                    <td className="advanced-checklist-id">
                      {item.id}
                    </td>
                    <td>
                      <Link
                        to={`/checklists/${encodeURIComponent(item.id)}`}
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export default AdvancedChecklistsPage