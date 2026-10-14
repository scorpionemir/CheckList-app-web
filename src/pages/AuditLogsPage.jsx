import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import './AuditLogsPage.css';

const PAGE_SIZE = 20;

const ACTION_LABELS = {
  'checklist.created': 'ایجاد چک‌لیست',
  'checklist.updated': 'ویرایش چک‌لیست',
  'checklist.deleted': 'حذف چک‌لیست',
  'checklist.restored': 'بازیابی چک‌لیست',
  'checklist.edit_permission_granted': 'اعطای مجوز ویرایش',
  'checklist.edit_permission_revoked': 'لغو مجوز ویرایش',
};

const ACTION_FILTERS = [
  { value: '', label: 'همه عملیات‌ها' },
  { value: 'checklist.created', label: 'ایجاد چک‌لیست' },
  { value: 'checklist.updated', label: 'ویرایش چک‌لیست' },
  { value: 'checklist.deleted', label: 'حذف چک‌لیست' },
  { value: 'checklist.restored', label: 'بازیابی چک‌لیست' },
  {
    value: 'checklist.edit_permission_granted',
    label: 'اعطای مجوز ویرایش',
  },
  {
    value: 'checklist.edit_permission_revoked',
    label: 'لغو مجوز ویرایش',
  },
];

function getActionLabel(action) {
  return ACTION_LABELS[action] || action || 'عملیات نامشخص';
}

function getActionClass(action) {
  if (action === 'checklist.created') return 'created';
  if (action === 'checklist.updated') return 'updated';
  if (
    action === 'checklist.deleted' ||
    action === 'checklist.edit_permission_revoked'
  ) {
    return 'deleted';
  }
  if (
    action === 'checklist.restored' ||
    action === 'checklist.edit_permission_granted'
  ) {
    return 'restored';
  }
  return 'default';
}

function getActorName(log) {
  const fullName = [log.first_name, log.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || log.username || 'کاربر نامشخص';
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'بله' : 'خیر';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function getErrorMessage(error) {
  if (error?.status === 401) {
    return 'نشست شما معتبر نیست. دوباره وارد حساب خود شوید.';
  }

  if (error?.status === 403) {
    return 'شما اجازه مشاهده تاریخچه تغییرات را ندارید.';
  }

  return error?.message || 'دریافت تاریخچه تغییرات با خطا مواجه شد.';
}

function SummaryCard({ title, value, icon, variant }) {
  return (
    <div className={`audit-summary-card audit-summary-${variant}`}>
      <div className="audit-summary-icon" aria-hidden="true">
        {icon}
      </div>

      <div className="audit-summary-content">
        <span className="audit-summary-title">{title}</span>
        <strong className="audit-summary-value">
          {Number(value || 0).toLocaleString('fa-IR')}
        </strong>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="audit-detail-row">
      <span className="audit-detail-label">{label}</span>
      <div className="audit-detail-value">{value}</div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    edits: 0,
    deletions: 0,
    restorations: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [searchInput, setSearchInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    action: '',
    from: '',
    to: '',
  });

  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (filters.search.trim()) {
        params.set('search', filters.search.trim());
      }

      if (filters.action) {
        params.set('action', filters.action);
      }

      if (filters.from) {
        params.set('from', filters.from);
      }

      if (filters.to) {
        params.set('to', filters.to);
      }

      const response = await apiRequest(
        `/api/audit-logs?${params.toString()}`,
        { method: 'GET' }
      );

      setLogs(Array.isArray(response?.logs) ? response.logs : []);

      setSummary({
        total: Number(response?.summary?.total || 0),
        edits: Number(response?.summary?.edits || 0),
        deletions: Number(response?.summary?.deletions || 0),
        restorations: Number(response?.summary?.restorations || 0),
      });

      setPagination({
        page: Number(response?.pagination?.page || page),
        limit: Number(response?.pagination?.limit || PAGE_SIZE),
        total: Number(response?.pagination?.total || 0),
        totalPages: Number(response?.pagination?.totalPages || 0),
      });
    } catch (requestError) {
      setLogs([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function applyFilters(event) {
    event.preventDefault();

    if (fromInput && toInput && fromInput > toInput) {
      setError('تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.');
      return;
    }

    setFilters({
      search: searchInput.trim(),
      action: actionInput,
      from: fromInput,
      to: toInput,
    });

    setPage(1);
    setSelectedLog(null);
  }

  function clearFilters() {
    setSearchInput('');
    setActionInput('');
    setFromInput('');
    setToInput('');

    setFilters({
      search: '',
      action: '',
      from: '',
      to: '',
    });

    setPage(1);
    setSelectedLog(null);
    setError('');
  }

  function goToPage(nextPage) {
    const totalPages = pagination.totalPages;

    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);
  }

  const pageStart =
    pagination.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const pageEnd = Math.min(page * PAGE_SIZE, pagination.total);

  return (
    <main className="audit-page" dir="rtl">
      <header className="audit-page-header">
        <div>
          <span className="audit-page-eyebrow">مدیریت سیستم</span>
          <h1>تاریخچه تغییرات</h1>
          <p>
            رویدادهای ثبت‌شده مربوط به ایجاد، ویرایش، حذف و بازیابی چک‌لیست‌ها
            را بررسی کنید.
          </p>
        </div>

        <button
          type="button"
          className="audit-refresh-button"
          onClick={loadLogs}
          disabled={loading}
        >
          <span aria-hidden="true">↻</span>
          {loading ? 'در حال دریافت...' : 'به‌روزرسانی'}
        </button>
      </header>

      <section className="audit-summary-grid" aria-label="خلاصه تاریخچه">
        <SummaryCard
          title="کل رویدادها"
          value={summary.total}
          icon="◷"
          variant="total"
        />

        <SummaryCard
          title="ویرایش‌ها"
          value={summary.edits}
          icon="✎"
          variant="edits"
        />

        <SummaryCard
          title="حذف‌ها"
          value={summary.deletions}
          icon="⌫"
          variant="deletions"
        />

        <SummaryCard
          title="بازیابی‌ها"
          value={summary.restorations}
          icon="↶"
          variant="restorations"
        />
      </section>

      <section className="audit-panel">
        <div className="audit-panel-heading">
          <div>
            <h2>رویدادها</h2>
            <p>برای یافتن رویداد موردنظر، از فیلترهای زیر استفاده کنید.</p>
          </div>
        </div>

        <form className="audit-filter-form" onSubmit={applyFilters}>
          <div className="audit-filter-field audit-search-field">
            <label htmlFor="audit-search">جست‌وجو</label>
            <input
              id="audit-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="نام کاربر، نام محل یا شناسه..."
            />
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-action">نوع عملیات</label>
            <select
              id="audit-action"
              value={actionInput}
              onChange={(event) => setActionInput(event.target.value)}
            >
              {ACTION_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-from">از تاریخ</label>
            <input
              id="audit-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
            />
          </div>

          <div className="audit-filter-field">
            <label htmlFor="audit-to">تا تاریخ</label>
            <input
              id="audit-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
            />
          </div>

          <div className="audit-filter-actions">
            <button type="submit" className="audit-primary-button">
              اعمال فیلتر
            </button>

            <button
              type="button"
              className="audit-secondary-button"
              onClick={clearFilters}
            >
              پاک‌کردن
            </button>
          </div>
        </form>

        {error && (
          <div className="audit-alert" role="alert">
            <span aria-hidden="true">!</span>
            <span>{error}</span>
            <button
              type="button"
              onClick={loadLogs}
              aria-label="تلاش مجدد"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">کاربر</th>
                <th scope="col">نوع عملیات</th>
                <th scope="col">محل / چک‌لیست</th>
                <th scope="col">زمان</th>
                <th scope="col">جزئیات</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="audit-state-cell">
                    <span className="audit-spinner" aria-hidden="true" />
                    در حال دریافت تاریخچه...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="audit-state-cell">
                    <div className="audit-empty-state">
                      <span className="audit-empty-icon" aria-hidden="true">
                        ◷
                      </span>
                      <strong>
                        {error
                          ? 'امکان دریافت تاریخچه وجود ندارد'
                          : 'رویدادی پیدا نشد'}
                      </strong>
                      <p>
                        {error
                          ? 'اتصال و دسترسی را بررسی کنید و دوباره تلاش کنید.'
                          : 'برای این فیلتر رویدادی ثبت نشده است. رویدادهای قدیمی که پیش از فعال‌شدن ثبت تاریخچه ایجاد شده‌اند، به‌صورت خودکار اضافه نمی‌شوند.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={`${log.source || 'audit'}-${log.id}`}>
                    <td>
                      <div className="audit-user-cell">
                        <span className="audit-user-avatar" aria-hidden="true">
                          {getActorName(log).charAt(0)}
                        </span>
                        <span>{getActorName(log)}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`audit-action-badge audit-action-${getActionClass(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    <td>
                      <div className="audit-site-cell">
                        <strong>{log.site_name || '—'}</strong>
                        <span>{log.checklist_type_name || 'نوع نامشخص'}</span>
                      </div>
                    </td>

                    <td className="audit-date-cell">
                      {formatDateTime(log.created_at)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="audit-detail-button"
                        onClick={() => setSelectedLog(log)}
                      >
                        مشاهده جزئیات
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="audit-pagination">
          <span className="audit-pagination-info">
            نمایش {pageStart.toLocaleString('fa-IR')} تا{' '}
            {pageEnd.toLocaleString('fa-IR')} از{' '}
            {pagination.total.toLocaleString('fa-IR')} رویداد
          </span>

          <div className="audit-pagination-controls">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={loading || page <= 1}
            >
              قبلی
            </button>

            <span>
              صفحه {page.toLocaleString('fa-IR')} از{' '}
              {Math.max(pagination.totalPages, 1).toLocaleString('fa-IR')}
            </span>

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={
                loading ||
                pagination.totalPages === 0 ||
                page >= pagination.totalPages
              }
            >
              بعدی
            </button>
          </div>
        </footer>
      </section>

      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >
          <section
            className="audit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
          >
            <header className="audit-modal-header">
              <div>
                <span className="audit-page-eyebrow">جزئیات رویداد</span>
                <h2 id="audit-modal-title">
                  {getActionLabel(selectedLog.action)}
                </h2>
              </div>

              <button
                type="button"
                className="audit-modal-close"
                onClick={() => setSelectedLog(null)}
                aria-label="بستن"
              >
                ×
              </button>
            </header>

            <div className="audit-modal-body">
              <DetailRow
                label="کاربر"
                value={getActorName(selectedLog)}
              />

              <DetailRow
                label="زمان ثبت"
                value={formatDateTime(selectedLog.created_at)}
              />

              <DetailRow
                label="تاریخ"
                value={formatDate(selectedLog.created_at)}
              />

              <DetailRow
                label="نام محل"
                value={selectedLog.site_name || '—'}
              />

              <DetailRow
                label="نوع چک‌لیست"
                value={selectedLog.checklist_type_name || '—'}
              />

              <DetailRow
                label="نوع عملیات"
                value={selectedLog.action || '—'}
              />

              <DetailRow
                label="شناسه رویداد"
                value={selectedLog.id || '—'}
              />

              <DetailRow
                label="شناسه هدف"
                value={selectedLog.target_id || '—'}
              />

              <DetailRow
                label="منبع رویداد"
                value={selectedLog.source || 'audit_logs'}
              />

              <div className="audit-json-section">
                <h3>اطلاعات ثبت‌شده</h3>
                <pre>
                  {formatValue(selectedLog.details)}
                </pre>
              </div>
            </div>

            <footer className="audit-modal-footer">
              <button
                type="button"
                className="audit-primary-button"
                onClick={() => setSelectedLog(null)}
              >
                بستن جزئیات
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}