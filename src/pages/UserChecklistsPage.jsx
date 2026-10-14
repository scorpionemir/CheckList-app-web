import { useCallback, useEffect, useMemo, useState } from 'react'
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

function getTypeId(item) {
  return String(
    item?.id ??
      item?.checklist_type_id ??
      item?.checklistTypeId ??
      '',
  )
}

function getTypeName(item) {
  return (
    item?.name ??
    item?.type_name ??
    item?.title ??
    item?.label ??
    'نوع چک‌لیست'
  )
}

function getUserId(item) {
  return String(
    item?.user_id ??
      item?.userId ??
      item?.contractor_id ??
      item?.contractorId ??
      '',
  )
}

function getChecklistTypeId(item) {
  return String(item?.checklist_type_id ?? item?.checklistTypeId ?? '')
}

function getChecklistDate(item) {
  const value = item?.checklist_date ?? item?.created_at

  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('fa-IR')
}

function getStatusLabel(status) {
  const labels = {
    submitted: 'ثبت‌شده',
    pending: 'در انتظار',
    draft: 'پیش‌نویس',
    approved: 'تأییدشده',
    rejected: 'ردشده',
    removed: 'حذف‌شده',
  }

  return labels[String(status ?? '').toLowerCase()] ?? status ?? '—'
}

export default function UserChecklistsPage() {
  const { userId } = useParams()

  const [types, setTypes] = useState([])
  const [checklists, setChecklists] = useState([])
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [permissionLoadingId, setPermissionLoadingId] = useState('')
  const [permissionMessage, setPermissionMessage] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [typesResult, checklistsResult] = await Promise.all([
        apiRequest('/api/checklist-types'),
        apiRequest('/api/checklists/manager/all'),
      ])

      const receivedTypes = getArray(typesResult, [
        'checklistTypes',
        'checklist_types',
        'types',
      ])

      const receivedChecklists = getArray(checklistsResult, [
        'checklists',
      ])

      const activeTypes = receivedTypes.filter(
        (item) =>
          item?.is_active !== false &&
          item?.isActive !== false,
      )

      const userChecklists = receivedChecklists.filter(
        (item) => getUserId(item) === String(userId),
      )

      setTypes(activeTypes)
      setChecklists(userChecklists)

      setSelectedTypeId((currentId) => {
        const stillExists = activeTypes.some(
          (type) => getTypeId(type) === currentId,
        )

        if (stillExists) return currentId

        return ''
      })
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات با خطا مواجه شد.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEditPermission = async (item) => {
    if (item?.status !== 'submitted') {
      setPermissionMessage({
        type: 'error',
        text: 'تغییر مجوز فقط برای چک‌لیست‌های ثبت‌شده امکان‌پذیر است.',
      })
      return
    }

    if (permissionLoadingId) return

    const checklistId = String(item.id)
    const nextPermission = item.edit_allowed !== true

    setPermissionLoadingId(checklistId)
    setPermissionMessage(null)

    try {
      await apiRequest(
        `/api/checklists/${encodeURIComponent(checklistId)}/edit-permission`,
        {
          method: 'PATCH',
          body: {
            editAllowed: nextPermission,
          },
        },
      )

      setChecklists((currentChecklists) =>
        currentChecklists.map((checklist) =>
          String(checklist.id) === checklistId
            ? {
                ...checklist,
                edit_allowed: nextPermission,
              }
            : checklist,
        ),
      )

      setPermissionMessage({
        type: 'success',
        text: nextPermission
          ? 'مجوز ویرایش این چک‌لیست فعال شد.'
          : 'مجوز ویرایش این چک‌لیست لغو شد.',
      })
    } catch (err) {
      setPermissionMessage({
        type: 'error',
        text:
          err?.message ||
          'تغییر مجوز ویرایش انجام نشد. لطفاً دوباره تلاش کن.',
      })
    } finally {
      setPermissionLoadingId('')
    }
  }

  const selectedType = types.find(
    (type) => getTypeId(type) === selectedTypeId,
  )

  const filteredChecklists = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase()

    return checklists.filter((item) => {
      const matchesType =
        getChecklistTypeId(item) === selectedTypeId

      const searchableValues = [
        item?.site_name,
        getChecklistDate(item),
        getStatusLabel(item?.status),
        item?.status,
      ]

      const matchesSearch =
        !searchText ||
        searchableValues.some((value) =>
          String(value ?? '')
            .toLocaleLowerCase()
            .includes(searchText),
        )

      return matchesType && matchesSearch
    })
  }, [checklists, selectedTypeId, search])

  if (loading) {
    return (
      <LoadingState
        message="در حال دریافت اطلاعات چک‌لیست‌ها"
        description="لطفاً تا تکمیل دریافت اطلاعات صبر کنید..."
        fullPage
      />
    )
  }

  return (
    <main className="page-container user-checklists-page">
      <PageTitle title="چک‌لیست‌های پیمانکار" />

      <section className="user-checklists-toolbar">
        <div className="user-checklists-toolbar-info">
          <strong>مدیریت چک‌لیست‌های پیمانکار</strong>
          <span>
            ابتدا نوع چک‌لیست را انتخاب کن تا سوابق مربوط به آن نمایش داده شود.
          </span>
        </div>

        <div className="user-checklists-toolbar-actions">
          <Link to="/users" className="secondary-button">
            بازگشت به کاربران
          </Link>

          <Link to="/trash" className="user-checklists-trash-link">
            سطل زباله
          </Link>

          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
          >
            بارگذاری مجدد
          </button>
        </div>
      </section>

      {error && (
        <section className="user-checklists-error" role="alert">
          <div>
            <strong>دریافت اطلاعات ناموفق بود</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
          >
            تلاش مجدد
          </button>
        </section>
      )}

      {!error && (
        <>
          <section className="checklist-types-section">
            <div className="user-checklists-section-heading">
              <div>
                <h2>انتخاب نوع چک‌لیست</h2>
                <p>
                  یکی از دسته‌ها را انتخاب کن تا سوابق آن را مشاهده کنی.
                </p>
              </div>

              <span className="user-checklists-count">
                {types.length} نوع چک‌لیست
              </span>
            </div>

            {types.length === 0 ? (
              <div className="empty-state">
                نوع چک‌لیستی برای نمایش وجود ندارد.
              </div>
            ) : (
              <div className="checklist-type-cards">
                {types.map((type, index) => {
                  const typeId = getTypeId(type)

                  const count = checklists.filter(
                    (item) =>
                      getChecklistTypeId(item) === typeId,
                  ).length

                  const isSelected = selectedTypeId === typeId

                  return (
                    <button
                      key={typeId}
                      type="button"
                      aria-pressed={isSelected}
                      className={`checklist-type-card ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedTypeId(typeId)
                        setSearch('')
                        setPermissionMessage(null)
                      }}
                    >
                      <span className="checklist-type-card-top">
                        <span className="checklist-type-number">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <span
                          className={`checklist-type-selection ${
                            isSelected ? 'active' : ''
                          }`}
                        >
                          {isSelected ? 'انتخاب‌شده' : 'مشاهده سوابق'}
                        </span>
                      </span>

                      <span className="checklist-type-card-title">
                        {getTypeName(type)}
                      </span>

                      <span className="checklist-type-card-count">
                        {count.toLocaleString('fa-IR')} چک‌لیست
                      </span>

                      <span className="checklist-type-card-footer">
                        <span>مشاهده چک‌لیست‌ها</span>
                        <span aria-hidden="true">←</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {selectedType && (
            <section className="user-checklists-results">
              <div className="user-checklists-results-heading">
                <div>
                  <span className="user-checklists-eyebrow">
                    سوابق پیمانکار
                  </span>

                  <h2>{getTypeName(selectedType)}</h2>

                  <p>
                    فهرست چک‌لیست‌های ثبت‌شده در این دسته
                  </p>
                </div>

                <div className="user-checklists-result-summary">
                  <span>تعداد نتایج</span>
                  <strong>
                    {filteredChecklists.length.toLocaleString('fa-IR')}
                  </strong>
                </div>
              </div>

              {permissionMessage && (
                <div
                  className={`edit-permission-message ${permissionMessage.type}`}
                  role={permissionMessage.type === 'error' ? 'alert' : 'status'}
                >
                  {permissionMessage.text}
                </div>
              )}

              <div className="user-checklists-search-row">
                <label
                  htmlFor="user-checklists-search"
                  className="user-checklists-search-label"
                >
                  جست‌وجو در سوابق
                </label>

                <input
                  id="user-checklists-search"
                  type="search"
                  className="checklist-search-input"
                  placeholder="نام سایت، تاریخ یا وضعیت را وارد کن..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    className="user-checklists-clear-search"
                    onClick={() => setSearch('')}
                  >
                    پاک‌کردن جست‌وجو
                  </button>
                )}
              </div>

              {filteredChecklists.length === 0 ? (
                <div className="user-checklists-empty">
                  <span
                    className="user-checklists-empty-icon"
                    aria-hidden="true"
                  >
                    ⌕
                  </span>

                  <h3>
                    {search
                      ? 'نتیجه‌ای پیدا نشد'
                      : 'هنوز چک‌لیستی ثبت نشده است'}
                  </h3>

                  <p>
                    {search
                      ? 'عبارت جست‌وجو را تغییر بده یا جست‌وجو را پاک کن.'
                      : 'برای این نوع چک‌لیست، سابقه‌ای برای این پیمانکار وجود ندارد.'}
                  </p>

                  {search && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setSearch('')}
                    >
                      پاک‌کردن جست‌وجو
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive user-checklists-table-wrapper">
                  <table className="data-table user-checklists-table">
                    <thead>
                      <tr>
                        <th>ردیف</th>
                        <th>نام سایت</th>
                        <th>تاریخ ثبت</th>
                        <th>وضعیت</th>
                        <th>مجوز ویرایش</th>
                        <th>عملیات</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredChecklists.map((item, index) => {
                        const isEditAllowed =
                          item.edit_allowed === true

                        const isSubmitted =
                          String(item.status ?? '').toLowerCase() ===
                          'submitted'

                        const isUpdating =
                          permissionLoadingId === String(item.id)

                        return (
                          <tr key={item.id}>
                            <td>
                              <span className="user-checklists-row-number">
                                {(index + 1).toLocaleString('fa-IR')}
                              </span>
                            </td>

                            <td>
                              <span className="user-checklists-site-name">
                                {item.site_name || 'بدون نام'}
                              </span>
                            </td>

                            <td>{getChecklistDate(item)}</td>

                            <td>
                              <span
                                className={`user-checklists-status user-checklists-status-${String(
                                  item.status ?? '',
                                ).toLowerCase()}`}
                              >
                                {getStatusLabel(item.status)}
                              </span>
                            </td>

                            <td>
                              {isSubmitted ? (
                                <div>
                                  <span
                                    className={`edit-permission-status ${
                                      isEditAllowed
                                        ? 'is-enabled'
                                        : 'is-disabled'
                                    }`}
                                  >
                                    {isEditAllowed
                                      ? 'فعال'
                                      : 'غیرفعال'}
                                  </span>

                                  <button
                                    type="button"
                                    className={`edit-permission-button ${
                                      isEditAllowed ? 'is-revoke' : ''
                                    }`}
                                    disabled={Boolean(permissionLoadingId)}
                                    onClick={() =>
                                      handleEditPermission(item)
                                    }
                                  >
                                    {isUpdating
                                      ? 'در حال انجام...'
                                      : isEditAllowed
                                        ? 'لغو مجوز'
                                        : 'فعال‌کردن مجوز'}
                                  </button>
                                </div>
                              ) : (
                                <span className="edit-permission-status is-disabled">
                                  غیرقابل تغییر
                                </span>
                              )}
                            </td>

                            <td>
                              <Link
                                to={`/checklists/${encodeURIComponent(item.id)}`}
                                className="table-action-link"
                              >
                                مشاهده جزئیات
                                <span aria-hidden="true">←</span>
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="user-checklists-results-footer">
                نمایش{' '}
                {filteredChecklists.length.toLocaleString('fa-IR')}{' '}
                مورد از{' '}
                {checklists.filter(
                  (item) =>
                    getChecklistTypeId(item) === selectedTypeId,
                ).length.toLocaleString('fa-IR')}{' '}
                چک‌لیست این دسته
              </div>
            </section>
          )}

          {!selectedType && types.length > 0 && (
            <section className="user-checklists-select-hint">
              <span aria-hidden="true">↖</span>
              <p>
                برای مشاهده سوابق، یکی از انواع چک‌لیست بالا را انتخاب کن.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  )
}