
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiRequest } from '../services/api'
import PageTitle from '../components/common/PageTitle'
import LoadingState from '../components/common/LoadingState'

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('fa-IR')
}

function formatLabel(value) {
  if (!value) return '—'

  const labels = {
    submitted: 'ثبت‌شده',
    draft: 'پیش‌نویس',
    pending: 'در انتظار',
    approved: 'تأییدشده',
    rejected: 'ردشده',
    completed: 'تکمیل‌شده',
  }

  return labels[value] || String(value)
}

function normalizeData(value) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()

  if (!trimmed) return {}

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'بله' : 'خیر'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—'

    return (
      <ul className="checklist-detail-list">
        {value.map((item, index) => (
          <li key={index}>
            {item !== null && typeof item === 'object'
              ? renderData(item)
              : renderValue(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return renderData(value)
  }

  return String(value)
}

function renderData(data) {
  const normalizedData = normalizeData(data)

  if (
    normalizedData === null ||
    normalizedData === undefined ||
    normalizedData === ''
  ) {
    return (
      <p className="empty-state">
        اطلاعاتی برای این چک‌لیست ثبت نشده است.
      </p>
    )
  }

  if (
    typeof normalizedData !== 'object'
  ) {
    return (
      <p className="checklist-detail-value">
        {String(normalizedData)}
      </p>
    )
  }

  const entries = Array.isArray(normalizedData)
    ? normalizedData.map((item, index) => [String(index + 1), item])
    : Object.entries(normalizedData)

  if (entries.length === 0) {
    return (
      <p className="empty-state">
        اطلاعاتی برای نمایش وجود ندارد.
      </p>
    )
  }

  return (
    <div className="checklist-detail-grid">
      {entries.map(([key, value]) => (
        <section className="checklist-detail-field" key={key}>
          <h3>{key}</h3>

          <div className="checklist-detail-value">
            {renderValue(value)}
          </div>
        </section>
      ))}
    </div>
  )
}

function extractChecklist(result) {
  const candidates = [
    result?.checklist,
    result?.data?.checklist,
    result?.data,
    result?.result?.checklist,
    result?.result,
    result,
  ]

  return candidates.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      item.id
  )
}

export default function ChecklistDetailsPage() {
  const { checklistId } = useParams()

  const [checklist, setChecklist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadChecklist = useCallback(async () => {
    if (!checklistId) {
      setChecklist(null)
      setError('شناسه چک‌لیست مشخص نیست.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/checklists/${encodeURIComponent(checklistId)}`
      )

      const receivedChecklist = extractChecklist(result)

      if (!receivedChecklist) {
        throw new Error(
          'اطلاعات چک‌لیست در پاسخ سرور پیدا نشد.'
        )
      }

      setChecklist({
        ...receivedChecklist,
        data: normalizeData(receivedChecklist.data),
      })
    } catch (err) {
      setChecklist(null)
      setError(
        err?.message ||
          'دریافت اطلاعات چک‌لیست با خطا مواجه شد.'
      )
    } finally {
      setLoading(false)
    }
  }, [checklistId])

  useEffect(() => {
    loadChecklist()
  }, [loadChecklist])

  if (loading) {
    return (
      <main className="page-container checklist-details-page">
        <LoadingState
          message="در حال دریافت جزئیات چک‌لیست"
          description="لطفاً چند لحظه صبر کنید..."
          fullPage
        />
      </main>
    )
  }

  if (error) {
    return (
      <main className="page-container checklist-details-page">
        <PageTitle
          title="جزئیات چک‌لیست"
          description="دریافت اطلاعات چک‌لیست"
        />

        <section className="error-message" role="alert">
          <p>{error}</p>

          <div className="checklist-detail-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={loadChecklist}
            >
              تلاش مجدد
            </button>

            <Link
              to="/checklists"
              className="secondary-button"
            >
              بازگشت به چک‌لیست‌ها
            </Link>
          </div>
        </section>
      </main>
    )
  }

  if (!checklist) {
    return (
      <main className="page-container checklist-details-page">
        <PageTitle title="جزئیات چک‌لیست" />

        <p className="empty-state">
          چک‌لیستی برای نمایش پیدا نشد.
        </p>

        <Link to="/checklists" className="secondary-button">
          بازگشت به چک‌لیست‌ها
        </Link>
      </main>
    )
  }

  return (
    <main
      className="page-container checklist-details-page"
      dir="rtl"
    >
      <PageTitle
        title="جزئیات چک‌لیست"
        description="مشاهده اطلاعات کلی و جزئیات ثبت‌شده"
      />

      <div className="checklist-detail-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => window.history.back()}
        >
          بازگشت به صفحه قبل
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={loadChecklist}
        >
          بارگذاری مجدد
        </button>
      </div>

      <section className="checklist-metadata">
        <h2>اطلاعات کلی</h2>

        <div className="checklist-detail-grid">
          <section className="checklist-detail-field">
            <h3>شناسه چک‌لیست</h3>
            <p className="checklist-detail-value">
              {checklist.id}
            </p>
          </section>

          <section className="checklist-detail-field">
            <h3>نام سایت</h3>
            <p className="checklist-detail-value">
              {checklist.site_name || '—'}
            </p>
          </section>

          <section className="checklist-detail-field">
            <h3>تاریخ ثبت</h3>
            <p className="checklist-detail-value">
              {formatDate(
                checklist.checklist_date || checklist.created_at
              )}
            </p>
          </section>

          <section className="checklist-detail-field">
            <h3>وضعیت</h3>
            <p className="checklist-detail-value">
              {formatLabel(checklist.status)}
            </p>
          </section>

          
<section className="checklist-detail-field">
  <h3>نام پیمانکار</h3>
  <p className="checklist-detail-value">
    {[
      checklist.contractor_first_name,
      checklist.contractor_last_name,
    ]
      .filter(Boolean)
      .join(' ') ||
      checklist.contractor_username ||
      'نام پیمانکار ثبت نشده است'}
  </p>
</section>

<section className="checklist-detail-field">
  <h3>شناسه پیمانکار</h3>
  <p className="checklist-detail-value">
    {checklist.user_id || '—'}
  </p>
</section>

        </div>
      </section>

      <section className="checklist-form-data">
        <h2>اطلاعات ثبت‌شده در فرم</h2>
        {renderData(checklist.data)}
      </section>
    </main>
  )
}
