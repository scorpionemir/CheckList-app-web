
function PageTitle({ title, description, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {children && <div className="page-title-actions">{children}</div>}
    </div>
  )
}

export default PageTitle