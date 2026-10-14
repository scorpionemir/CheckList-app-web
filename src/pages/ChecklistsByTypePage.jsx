
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiRequest } from '../services/api'
import PageTitle from '../components/common/PageTitle'
import LoadingState from '../components/common/LoadingState'

function getArray(result, keys = []) {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) {
      return result[key]
    }
  }

  return []
}

function ChecklistsByTypePage() {
  const { checklistTypeId } = useParams()

  const [checklists, setChecklists] = useState([])
  const [typeName, setTypeName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true

    async function loadChecklists() {
      setLoading(true)
      setError('')
      setSearch('')
      setNotice('')

      try {
        const [typesResult, checklistsResult] =
          await Promise.all([
            apiRequest('/api/checklist-types'),
            apiRequest('/api/checklists/manager/all'),
          ])

        const types = getArray(typesResult, [
          'checklistTypes',
          'checklist_types',
          'types',
        ])

        const allChecklists = getArray(checklistsResult, [
          'checklists',
        ])

        const selectedType = types.find(
          (type) =>
            String(type?.id ?? type?.checklist_type_id) ===
            String(checklistTypeId)
        )

        const filtered = allChecklists.filter(
          (item) =>
            String(
              item?.checklist_type_id ??
              item?.checklistTypeId
            ) === String(checklistTypeId)
        )

        if (active) {
          setTypeName(
            selectedType?.name ??
            selectedType?.type_name ??
            selectedType?.title ??
            'چک‌لیست‌های بازدید'
          )

          setChecklists(filtered)
        }
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
              'دریافت چک‌لیست‌ها ناموفق بود.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadChecklists()

    return () => {
      active = false
    }
  }, [checklistTypeId])

  async function handleDelete(item) {
    const checklistId = item?.id

    if (!checklistId) {
      setNotice('')
      setError('شناسهٔ چک‌لیست معتبر نیست.')
      return
    }

    const confirmed = window.confirm(
      `آیا می‌خواهی چک‌لیست «${item.site_name || 'بدون نام'}» را به سطل زباله منتقل کنی؟\n\nاطلاعات چک‌لیست در دیتابیس باقی می‌ماند و امکان بازیابی آن از سطل زباله وجود خواهد داشت.`
    )

    if (!confirmed) return

    setDeletingId(checklistId)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/checklists/${encodeURIComponent(checklistId)}`,
        { method: 'DELETE' }
      )

      setChecklists((current) =>
        current.filter(
          (checklist) =>
            String(checklist.id) !== String(checklistId)
        )
      )

      setNotice(
        'چک‌لیست با موفقیت به سطل زباله منتقل شد.'
      )
    } catch (err) {
      setError(
        err?.message ||
          'انتقال چک‌لیست به سطل زباله ناموفق بود. لطفاً دوباره تلاش کن.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const filteredChecklists = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fa')

    if (!query) return checklists

    return checklists.filter((item) => {
      const searchableText = [
        item?.site_name,
        item?.checklist_date,
        item?.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fa')

      return searchableText.includes(query)
    })
  }, [checklists, search])

  return (
    <div className="checklists-by-type-page" dir="rtl">
      <PageTitle
        title={typeName || 'چک‌لیست‌های بازدید'}
        description="فهرست چک‌لیست‌های ثبت‌شده"
      >
        <Link to="/checklists" className="secondary-link">
          بازگشت به انواع چک‌لیست
        </Link>
      </PageTitle>

      {!loading && !error && (
        <div className="checklists-toolbar">
          <div className="checklists-search">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو بر اساس نام محل، تاریخ یا وضعیت..."
              aria-label="جست‌وجوی چک‌لیست‌ها"
            />
          </div>

          <span className="checklists-count">
            تعداد موارد: {filteredChecklists.length}
          </span>
        </div>
      )}

      {loading && (
        <LoadingState
          message="در حال دریافت چک‌لیست‌های بازدید"
          description="لطفاً چند لحظه صبر کن."
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

      {!loading && !error && notice && (
        <div
          className="checklist-delete-success"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          {notice}
        </div>
      )}

      {!loading && !error && checklists.length === 0 && (
        <div className="content-panel empty-state checklist-page-message">
          <h3>چک‌لیستی برای این نوع ثبت نشده است.</h3>
          <p>
            اگر چک‌لیستی ثبت شده، ساختار پاسخ API و شناسه نوع آن را
            بررسی کن.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        checklists.length > 0 &&
        filteredChecklists.length === 0 && (
          <div className="content-panel empty-state checklist-page-message">
            <h3>موردی پیدا نشد.</h3>
            <p>عبارت جست‌وجو را تغییر بده و دوباره امتحان کن.</p>
          </div>
        )}

      {!loading &&
        !error &&
        filteredChecklists.length > 0 && (
          <div className="content-panel checklist-table-panel">
            <div className="table-scroll">
              <table className="checklists-table">
                <thead>
                  <tr>
                    <th>نام محل</th>
                    <th>تاریخ</th>
                    <th>وضعیت</th>
                    <th>جزئیات</th>
                    <th>عملیات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredChecklists.map((item) => (
                    <tr key={item.id}>
                      <td>{item.site_name || '—'}</td>

                      <td>
                        {item.checklist_date
                          ? String(item.checklist_date).slice(0, 10)
                          : '—'}
                      </td>

                      <td>{item.status || '—'}</td>

                      <td>
                        <Link
                          className="table-action"
                          to={`/checklists/${encodeURIComponent(item.id)}`}
                        >
                          مشاهده جزئیات
                        </Link>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="checklist-delete-button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId !== null}
                          aria-label={`انتقال چک‌لیست ${item.site_name || item.id} به سطل زباله`}
                        >
                          {String(deletingId) === String(item.id)
                            ? 'در حال انتقال...'
                            : 'انتقال به سطل زباله'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  )
}

export default ChecklistsByTypePage
