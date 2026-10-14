
function LoadingState({
  message = 'در حال دریافت اطلاعات',
  description = 'لطفاً چند لحظه صبر کنید...',
  fullPage = false,
}) {
  return (
    <div
      className={`loading-state${fullPage ? ' loading-state-full-page' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-state-spinner" aria-hidden="true" />

      <p className="loading-state-message">{message}</p>

      {description && (
        <span className="loading-state-description">{description}</span>
      )}
    </div>
  )
}

export default LoadingState
