// CheckList-Web/src/pages/UsersPage.jsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Formik,
  Form,
  Field,
  ErrorMessage,
  useField,
} from 'formik'
import * as Yup from 'yup'

import {
  getProvincesList,
  getCities,
} from '@code-plate/iran-cities'

import { isValidJalaaliDate, toGregorian } from 'jalaali-js'

import DatePickerModule from 'react-multi-date-picker'

const DatePicker = DatePickerModule.default

import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'

import PageTitle from '../components/common/PageTitle'
import {
  createUser,
  getUsers,
  deactivateUser,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingState from '../components/common/LoadingState'

const provinces = getProvincesList()

// --------------------------------------------------
// توابع تاریخ شمسی
// --------------------------------------------------

function normalizeDigits(value = '') {
  return String(value)
    .replace(/[۰-۹]/g, (digit) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
    )
}

function toPersianDigits(value = '') {
  return String(value).replace(/\d/g, (digit) =>
    '۰۱۲۳۴۵۶۷۸۹'[Number(digit)],
  )
}

function parseJalaliDate(value) {
  if (typeof value !== 'string') return null

  const normalized = normalizeDigits(value).trim()

  const match = normalized.match(
  /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (
    year < 1200 ||
    year > 1405 ||
    !isValidJalaaliDate(year, month, day)
  ) {
    return null
  }

  return { year, month, day }
}

function jalaliToGregorianISO(value) {
  const jalaliDate = parseJalaliDate(value)

  if (!jalaliDate) {
    throw new Error('تاریخ تولد شمسی معتبر نیست.')
  }

  const { gy, gm, gd } = toGregorian(
    jalaliDate.year,
    jalaliDate.month,
    jalaliDate.day,
  )

  return [
    gy,
    String(gm).padStart(2, '0'),
    String(gd).padStart(2, '0'),
  ].join('-')
}

function formatJalaliInput(value = '') {
  const digits = normalizeDigits(value)
    .replace(/\D/g, '')
    .slice(0, 8)

  if (digits.length <= 4) {
    return toPersianDigits(digits)
  }

  if (digits.length <= 6) {
    return toPersianDigits(
      `${digits.slice(0, 4)}/${digits.slice(4)}`,
    )
  }

  return toPersianDigits(
    `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`,
  )
}

// --------------------------------------------------
// اعتبارسنجی فرم
// --------------------------------------------------

const userSchema = Yup.object({
  firstName: Yup.string()
    .trim()
    .required('نام را وارد کنید'),

  lastName: Yup.string()
    .trim()
    .required('نام خانوادگی را وارد کنید'),

  birthDate: Yup.string()
    .required('تاریخ تولد را وارد کنید')
    .test(
      'valid-jalali-date',
      'تاریخ تولد شمسی معتبر نیست؛ نمونه: ۱۳۷۵/۰۶/۲۳',
      (value) => Boolean(parseJalaliDate(value)),
    ),

  fatherName: Yup.string()
    .trim()
    .required('نام پدر را وارد کنید'),

  nationalId: Yup.string()
    .matches(/^\d{10}$/, 'کد ملی باید ۱۰ رقم باشد')
    .required('کد ملی را وارد کنید'),

  mobile: Yup.string()
    .matches(
      /^09\d{9}$/,
      'شماره موبایل باید با 09 شروع شده و ۱۱ رقم باشد',
    )
    .required('شماره موبایل را وارد کنید'),

  role: Yup.string()
    .oneOf(
      ['contractor', 'manager', 'admin'],
      'نقش انتخاب‌شده معتبر نیست',
    )
    .required('نقش کاربر را انتخاب کنید'),

  province: Yup.string()
    .required('استان را انتخاب کنید'),

  city: Yup.string()
    .required('شهر را انتخاب کنید'),

  district: Yup.string()
    .trim()
    .required('منطقه را وارد کنید'),

  street: Yup.string()
    .trim()
    .required('خیابان را وارد کنید'),

  alley: Yup.string()
    .trim()
    .required('کوچه را وارد کنید'),

  plaque: Yup.string()
    .trim()
    .required('پلاک را وارد کنید'),

  postalCode: Yup.string()
    .trim()
    .required('کد پستی را وارد کنید'),
})

const initialValues = {
  firstName: '',
  lastName: '',
  birthDate: '',
  fatherName: '',
  nationalId: '',
  mobile: '',
  role: 'contractor',
  province: '',
  city: '',
  district: '',
  street: '',
  alley: '',
  plaque: '',
  postalCode: '',
}

// --------------------------------------------------
// فیلد عمومی فرم
// --------------------------------------------------

function FieldInput({
  name,
  label,
  type = 'text',
  placeholder = '',
}) {
  return (
    <div className="user-form-group">
      <label htmlFor={name}>{label}</label>

      <Field
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        className="form-input"
      />

      <ErrorMessage
        name={name}
        component="span"
        className="field-error"
      />
    </div>
  )
}

// --------------------------------------------------
// فیلد تاریخ تولد شمسی همراه با تقویم
// این کامپوننت باید بیرون از UsersPage باشد.
// --------------------------------------------------


function JalaliDateField({ name, label }) {
  const [field, meta, helpers] = useField(name)

  const hasError = meta.touched && Boolean(meta.error)
  const normalizedDate = parseJalaliDate(field.value)

  const datePickerValue = normalizedDate
    ? [
        normalizedDate.year,
        String(normalizedDate.month).padStart(2, '0'),
        String(normalizedDate.day).padStart(2, '0'),
      ].join('/')
    : ''

  return (
    <div className="user-form-group" style={{ width: '100%' }}>
      <label
        htmlFor={name}
        style={{
          display: 'block',
          marginBottom: '8px',
          textAlign: 'right',
        }}
      >
        {label}
      </label>

      <DatePicker
        value={datePickerValue}
        onChange={(date) => {
          if (!date) return

          const formattedDate = [
            String(date.year).padStart(4, '0'),
            String(date.month.number).padStart(2, '0'),
            String(date.day).padStart(2, '0'),
          ].join('/')

          helpers.setValue(toPersianDigits(formattedDate))
          helpers.setTouched(true)
        }}
        calendar={persian}
        locale={persian_fa}
        format="YYYY/MM/DD"
        calendarPosition="bottom-right"
        editable={false}
        render={(_, openCalendar) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              width: '100%',
              direction: 'ltr',
            }}
          >
            <input
              id={name}
              name={field.name}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              placeholder="۱۳۷۵/۰۶/۲۳"
              value={field.value || ''}
              onChange={(event) => {
                helpers.setValue(
                  formatJalaliInput(event.target.value),
                )
              }}
              onBlur={() => helpers.setTouched(true)}
              aria-invalid={hasError}
              aria-describedby={
                hasError ? `${name}-error` : undefined
              }
              className="form-input"
              style={{
                flex: 1,
                width: 0,
                minWidth: 0,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                textAlign: 'center',
                direction: 'ltr',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="button"
              onClick={openCalendar}
              aria-label="انتخاب تاریخ شمسی"
              title="انتخاب تاریخ شمسی"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '46px',
                border: '1px solid #d1d5db',
                borderLeft: 0,
                borderTopRightRadius: '6px',
                borderBottomRightRadius: '6px',
                cursor: 'pointer',
                background: '#fff',
                color: '#374151',
                fontSize: '20px',
              }}
            >
              <span aria-hidden="true">▦</span>
            </button>
          </div>
        )}
      />

      {hasError && (
        <span
          id={`${name}-error`}
          className="field-error"
          style={{
            display: 'block',
            marginTop: '5px',
            textAlign: 'right',
          }}
        >
          {meta.error}
        </span>
      )}
    </div>
  )
}


// --------------------------------------------------
// توابع اطلاعات کاربران
// --------------------------------------------------

function getUserActiveStatus(user) {
  const value = user.isActive ?? user.is_active

  // تا زمانی که API فیلد وضعیت را ارسال نکرده،
  // وضعیت را فعال در نظر می‌گیریم.
  return value !== false
}

function getUserFirstName(user) {
  return user.firstName ?? user.first_name ?? ''
}

function getUserLastName(user) {
  return user.lastName ?? user.last_name ?? ''
}

function getUserUsername(user) {
  return user.username ?? user.nationalId ?? user.national_id ?? ''
}

function getRoleLabel(role) {
  const normalizedRole = String(role || '').toLowerCase()

  const labels = {
    contractor: 'پیمانکار',
    manager: 'مدیر',
    admin: 'ادمین',
  }

  return labels[normalizedRole] || role || 'نامشخص'
}

// --------------------------------------------------
// صفحه مدیریت کاربران
// --------------------------------------------------

function UsersPage() {
  const { user: currentUser } = useAuth()

  const currentRole = String(
    currentUser?.role || '',
  ).toLowerCase()

  const canAssignPrivilegedRole = [
    'manager',
    'admin',
  ].includes(currentRole)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [createError, setCreateError] = useState('')
  const [deactivatingUserId, setDeactivatingUserId] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const result = await getUsers()

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.users)
          ? result.users
          : []

      setUsers(list)
    } catch (error) {
      setLoadError(
        error.message || 'دریافت کاربران ناموفق بود.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users.filter((user) => {
      const firstName = getUserFirstName(user)
      const lastName = getUserLastName(user)
      const username = getUserUsername(user)
      const nationalId = user.nationalId ?? user.national_id ?? ''
      const mobile = user.mobile ?? user.phone ?? ''
      const role = String(user.role || '').toLowerCase()
      const isActive = getUserActiveStatus(user)

      const searchableValues = [
        firstName,
        lastName,
        `${firstName} ${lastName}`,
        username,
        nationalId,
        mobile,
      ]

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        )

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive)

      const matchesRole =
        roleFilter === 'all' || role === roleFilter

      return matchesSearch && matchesStatus && matchesRole
    })
  }, [users, search, statusFilter, roleFilter])

  const activeUsersCount = useMemo(
    () => users.filter(getUserActiveStatus).length,
    [users],
  )

  const inactiveUsersCount = users.length - activeUsersCount

  async function handleCreate(
    values,
    { setSubmitting, resetForm },
  ) {
    setCreateError('')
    setSuccessMessage('')

    let payload

    try {
      payload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        birthDate: jalaliToGregorianISO(values.birthDate),
        fatherName: values.fatherName.trim(),
        nationalId: normalizeDigits(values.nationalId).trim(),
        mobile: normalizeDigits(values.mobile).trim(),
        role: values.role,

        address: {
          province: values.province,
          city: values.city,
          district: values.district.trim(),
          street: values.street.trim(),
          alley: values.alley.trim(),
          plaque: values.plaque.trim(),
          postalCode: normalizeDigits(values.postalCode).trim(),
        },
      }
    } catch (error) {
      setCreateError(
        error.message || 'تاریخ تولد شمسی معتبر نیست.',
      )
      setSubmitting(false)
      return
    }

    try {
      await createUser(payload)

      resetForm()
      setFormOpen(false)

      setSuccessMessage(
        'کاربر با موفقیت ثبت شد. نام کاربری کد ملی و رمز اولیه شماره موبایل است.',
      )

      await loadUsers()
    } catch (error) {
      setCreateError(
        error.message || 'ثبت کاربر ناموفق بود.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser(user) {
    const userId = user.id

    if (!userId) {
      window.alert('شناسه کاربر مشخص نیست.')
      return
    }

    if (!getUserActiveStatus(user)) {
      window.alert('این حساب از قبل غیرفعال است.')
      return
    }

    const fullName =
      `${getUserFirstName(user)} ${getUserLastName(user)}`.trim() ||
      getUserUsername(user) ||
      'این کاربر'

    const confirmed = window.confirm(
      `آیا می‌خواهی حساب «${fullName}» را غیرفعال کنی؟\n\n` +
        'حساب دیگر نمی‌تواند وارد بخش‌های محافظت‌شده شود؛ ' +
        'اما اطلاعات کاربر و چک‌لیست‌های قبلی او حذف نخواهند شد.',
    )

    if (!confirmed) return

    setDeactivatingUserId(userId)
    setSuccessMessage('')
    setLoadError('')

    try {
      const result = await deactivateUser(userId)

      setSuccessMessage(
        result?.message || `حساب «${fullName}» غیرفعال شد.`,
      )

      await loadUsers()
    } catch (error) {
      window.alert(
        error.message || 'غیرفعال‌سازی حساب انجام نشد.',
      )
    } finally {
      setDeactivatingUserId(null)
    }
  }

  return (
    <div>
      <PageTitle
        title="مدیریت کاربران"
        description="ثبت کاربران و مشاهده چک‌لیست‌های ثبت‌شده"
      >
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setFormOpen((open) => !open)
            setCreateError('')
            setSuccessMessage('')
          }}
        >
          {formOpen ? 'بستن فرم' : '+ ثبت کاربر'}
        </button>
      </PageTitle>

      {successMessage && (
        <div className="success-banner" role="status">
          {successMessage}
        </div>
      )}

      {formOpen && (
        <section className="content-panel user-form-panel">
          <div className="panel-heading">
            <h2>ثبت کاربر جدید</h2>

            <span className="coming-soon-badge">
              رمز اولیه = شماره موبایل
            </span>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={userSchema}
            onSubmit={handleCreate}
          >
            {({ isSubmitting, values, setFieldValue }) => {
              const cities = values.province
                ? getCities(values.province)
                : []

              return (
                <Form className="user-form">
                  <h3 className="form-section-heading">
                    اطلاعات هویتی
                  </h3>

                  <div className="user-form-grid">
                    <FieldInput
                      name="firstName"
                      label="نام"
                    />

                    <FieldInput
                      name="lastName"
                      label="نام خانوادگی"
                    />

                    <FieldInput
                      name="fatherName"
                      label="نام پدر"
                    />

                    <JalaliDateField
                      name="birthDate"
                      label="تاریخ تولد (شمسی)"
                    />

                    <FieldInput
                      name="nationalId"
                      label="کد ملی"
                      placeholder="۱۰ رقم"
                    />

                    <FieldInput
                      name="mobile"
                      label="شماره موبایل"
                      placeholder="09xxxxxxxxx"
                    />

                    <div className="user-form-group">
                      <label htmlFor="role">نقش کاربر</label>

                      <Field
                        as="select"
                        id="role"
                        name="role"
                        className="form-input"
                      >
                        <option value="contractor">
                          پیمانکار
                        </option>

                        {canAssignPrivilegedRole && (
                          <>
                            <option value="manager">
                              مدیر
                            </option>

                            <option value="admin">
                              ادمین
                            </option>
                          </>
                        )}
                      </Field>

                      <ErrorMessage
                        name="role"
                        component="span"
                        className="field-error"
                      />
                    </div>
                  </div>

                  <h3 className="form-section-heading">
                    نشانی
                  </h3>

                  <div className="user-form-grid">
                    <div className="user-form-group">
                      <label htmlFor="province">استان</label>

                      <Field
                        as="select"
                        id="province"
                        name="province"
                        className="form-input"
                        onChange={(event) => {
                          const selectedProvince =
                            event.target.value

                          setFieldValue(
                            'province',
                            selectedProvince,
                          )

                          setFieldValue('city', '')
                        }}
                      >
                        <option value="">
                          استان را انتخاب کنید
                        </option>

                        {provinces.map((province) => (
                          <option
                            key={province.id}
                            value={province.fa}
                          >
                            {province.fa}
                          </option>
                        ))}
                      </Field>

                      <ErrorMessage
                        name="province"
                        component="span"
                        className="field-error"
                      />
                    </div>

                    <div className="user-form-group">
                      <label htmlFor="city">شهر</label>

                      <Field
                        as="select"
                        id="city"
                        name="city"
                        className="form-input"
                        disabled={!values.province}
                      >
                        <option value="">
                          {values.province
                            ? 'شهر را انتخاب کنید'
                            : 'ابتدا استان را انتخاب کنید'}
                        </option>

                        {cities.map((city) => (
                          <option
                            key={city.id}
                            value={city.fa}
                          >
                            {city.fa}
                          </option>
                        ))}
                      </Field>

                      <ErrorMessage
                        name="city"
                        component="span"
                        className="field-error"
                      />
                    </div>

                    <FieldInput
                      name="district"
                      label="منطقه"
                    />

                    <FieldInput
                      name="street"
                      label="خیابان"
                    />

                    <FieldInput
                      name="alley"
                      label="کوچه"
                    />

                    <FieldInput
                      name="plaque"
                      label="پلاک"
                    />

                    <FieldInput
                      name="postalCode"
                      label="کد پستی"
                    />
                  </div>

                  {createError && (
                    <div
                      className="form-error"
                      role="alert"
                    >
                      {createError}
                    </div>
                  )}

                  <div className="user-form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'در حال ثبت...'
                        : 'ثبت کاربر'}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setFormOpen(false)}
                      disabled={isSubmitting}
                    >
                      انصراف
                    </button>
                  </div>
                </Form>
              )
            }}
          </Formik>
        </section>
      )}

      <section className="content-panel users-list-panel">
        <div className="panel-heading">
          <h2>فهرست کاربران</h2>

          <button
            type="button"
            className="secondary-button"
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? 'در حال دریافت...' : 'بروزرسانی'}
          </button>
        </div>

        <div className="users-summary">
          <div className="users-summary-item">
            <span>کل کاربران</span>
            <strong>{users.length}</strong>
          </div>

          <div className="users-summary-item">
            <span>کاربران فعال</span>
            <strong>{activeUsersCount}</strong>
          </div>

          <div className="users-summary-item">
            <span>کاربران غیرفعال</span>
            <strong>{inactiveUsersCount}</strong>
          </div>
        </div>

        <div className="users-toolbar">
          <div className="users-search">
            <label htmlFor="users-search-input">
              جست‌وجوی کاربر
            </label>

            <input
              id="users-search-input"
              type="search"
              className="form-input"
              placeholder="نام، کد ملی، نام کاربری ..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="users-filter">
            <label htmlFor="users-status-filter">
              وضعیت
            </label>

            <select
              id="users-status-filter"
              className="form-input"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">همه کاربران</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>

          <div className="users-filter">
            <label htmlFor="users-role-filter">
              نقش
            </label>

            <select
              id="users-role-filter"
              className="form-input"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
            >
              <option value="all">همه نقش‌ها</option>
              <option value="contractor">پیمانکار</option>
              <option value="manager">مدیر</option>
              <option value="admin">ادمین</option>
            </select>
          </div>

          <div className="users-filter-summary">
            نمایش {filteredUsers.length} از {users.length} کاربر
          </div>
        </div>

        {loadError && (
          <div
            className="form-error users-load-error"
            role="alert"
          >
            {loadError}
          </div>
        )}

        {loading ? (
          <LoadingState
            message="در حال دریافت اطلاعات کاربران"
            description="لطفاً تا دریافت اطلاعات از سرور صبر کنید."
          />
        ) : loadError ? null : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">♙</div>

            <h3>
              {users.length === 0
                ? 'کاربری برای نمایش وجود ندارد'
                : 'کاربری با این مشخصات پیدا نشد'}
            </h3>

            <p>
              عبارت جست‌وجو یا فیلترهای انتخاب‌شده را تغییر بده.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="users-table">
              <thead>
                <tr>
                  <th>نام و نام خانوادگی</th>
                  <th>کد ملی / نام کاربری</th>
                  <th>نقش</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => {
                  const id = user.id
                  const firstName = getUserFirstName(user)
                  const lastName = getUserLastName(user)
                  const username =
                    getUserUsername(user) || '—'
                  const isActive = getUserActiveStatus(user)

                  return (
                    <tr key={id || username}>
                      <td>
                        {`${firstName} ${lastName}`.trim() || '—'}
                      </td>

                      <td>{username}</td>

                      <td>{getRoleLabel(user.role)}</td>

                      <td>
                        <span
                          className={`user-status ${
                            isActive ? 'active' : 'inactive'
                          }`}
                        >
                          {isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>

                      <td>
                        <div className="users-row-actions">
                          <Link
                            to={`/users/${encodeURIComponent(id)}/checklists`}
                            className="table-action"
                          >
                            مشاهده چک‌لیست‌ها
                          </Link>

                          <button
                            type="button"
                            className="user-delete-button"
                            onClick={() =>
                              handleDeleteUser(user)
                            }
                            disabled={
                              !id ||
                              !isActive ||
                              deactivatingUserId === id
                            }
                            title={
                              !isActive
                                ? 'این حساب قبلاً غیرفعال شده است'
                                : 'غیرفعال‌سازی حساب کاربر'
                            }
                          >
                            {deactivatingUserId === id
                              ? 'در حال غیرفعال‌سازی...'
                              : isActive
                                ? 'غیرفعال‌سازی'
                                : 'غیرفعال'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default UsersPage