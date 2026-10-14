
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { apiRequest } from '../services/api'
import PageTitle from '../components/common/PageTitle'
import LoadingState from '../components/common/LoadingState'

function getArray(result, keys = []) {
  if (Array.isArray(result)) return result

  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key]
  }

  return []
}

function parseObject(value) {
  if (!value) return {}
  if (typeof value === 'object') return value

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }

  return {}
}

function getCoordinates(item) {
  const roots = [
    parseObject(item?.data),
    parseObject(item?.checklist_data),
    parseObject(item?.checklistData),
    parseObject(item?.form_data),
    parseObject(item?.payload),
    item,
  ]

  for (const root of roots) {
    const location =
      root?.siteLocation ??
      root?.site_location ??
      root?.location ??
      root

    const gps = location?.gps ?? {}
    const manual = location?.manual ?? {}

    const candidates = [
      {
        latitude: gps.latitude,
        longitude: gps.longitude,
        source: 'GPS',
      },
      {
        latitude: manual.latitude,
        longitude: manual.longitude,
        source: 'دستی',
      },
      {
        latitude: location.latitude,
        longitude: location.longitude,
        source: 'ثبت‌شده',
      },
      {
        latitude: item?.latitude,
        longitude: item?.longitude,
        source: 'ثبت‌شده',
      },
    ]

    for (const candidate of candidates) {
      const latitude = Number(candidate.latitude)
      const longitude = Number(candidate.longitude)

      if (
        candidate.latitude !== null &&
        candidate.latitude !== undefined &&
        candidate.longitude !== null &&
        candidate.longitude !== undefined &&
        candidate.latitude !== '' &&
        candidate.longitude !== '' &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        (latitude !== 0 || longitude !== 0)
      ) {
        return {
          latitude,
          longitude,
          source: candidate.source,
        }
      }
    }
  }

  return null
}

function getSiteName(item) {
  const data = parseObject(item?.data)
  const siteInfo =
    data?.siteInformation ??
    data?.site_information ??
    {}

  return (
    item?.site_name ??
    item?.siteName ??
    siteInfo?.siteName ??
    siteInfo?.site_name ??
    item?.site?.name ??
    'سایت بدون نام'
  )
}

function getTypeName(item, types) {
  const typeId =
    item?.checklist_type_id ??
    item?.checklistTypeId

  const type = types.find(
    (entry) =>
      String(entry?.id ?? entry?.checklist_type_id) ===
      String(typeId)
  )

  return (
    item?.checklist_type_name ??
    item?.type_name ??
    type?.name ??
    type?.type_name ??
    'نامشخص'
  )
}

function MapBoundsUpdater({ sites }) {
  const map = useMap()

  useEffect(() => {
    if (sites.length === 1) {
      map.setView(
        [sites[0].coordinates.latitude, sites[0].coordinates.longitude],
        14
      )
    } else if (sites.length > 1) {
      const bounds = sites.map((site) => [
        site.coordinates.latitude,
        site.coordinates.longitude,
      ])

      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }
  }, [map, sites])

  return null
}

export default function SitesMapPage() {
  const [checklists, setChecklists] = useState([])
  const [types, setTypes] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [checklistsResult, typesResult] = await Promise.all([
          apiRequest('/api/checklists/manager/all'),
          apiRequest('/api/checklist-types'),
        ])

        if (!active) return

        setChecklists(
          getArray(checklistsResult, ['checklists'])
        )
        setTypes(
          getArray(typesResult, [
            'checklistTypes',
            'checklist_types',
            'types',
          ])
        )
      } catch (err) {
        if (active) {
          setError(
            err?.message || 'دریافت اطلاعات سایت‌ها ناموفق بود.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  const sites = useMemo(() => {
    const result = checklists
      .map((item) => {
        const coordinates = getCoordinates(item)

        if (!coordinates) return null

        return {
          ...item,
          coordinates,
          siteName: getSiteName(item),
          typeName: getTypeName(item, types),
        }
      })
      .filter(Boolean)

    const query = search.trim().toLocaleLowerCase('fa')

    return result.filter((site) => {
      const matchesSearch = [
        site.siteName,
        site.typeName,
        site.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('fa')
        .includes(query)

      const matchesType =
        typeFilter === 'all' ||
        String(
          site.checklist_type_id ??
          site.checklistTypeId
        ) === String(typeFilter)

      return matchesSearch && matchesType
    })
  }, [checklists, types, search, typeFilter])

  const sitesWithCoordinates = useMemo(
    () => checklists.filter((item) => getCoordinates(item)).length,
    [checklists]
  )

  const withoutCoordinates =
    checklists.length - sitesWithCoordinates

  return (
    <div className="sites-map-page" dir="rtl">
      <PageTitle
        title="نقشه موقعیت سایت‌ها"
        description="مشاهده موقعیت جغرافیایی ثبت‌شده در چک‌لیست‌های بازدید"
      >
        <Link to="/checklists" className="secondary-link">
          بازگشت به چک‌لیست‌ها
        </Link>
      </PageTitle>

      {loading && (
        <LoadingState
          message="در حال دریافت موقعیت سایت‌ها"
          description="لطفاً چند لحظه صبر کنید."
        />
      )}

      {!loading && error && (
        <div className="form-error checklist-page-message" role="alert">
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

      {!loading && !error && (
        <>
          <section className="sites-map-summary">
            <article>
              <span>کل چک‌لیست‌ها</span>
              <strong>{checklists.length}</strong>
            </article>

            <article>
              <span>دارای مختصات معتبر</span>
              <strong>{sitesWithCoordinates}</strong>
            </article>

            <article>
              <span>بدون مختصات معتبر</span>
              <strong>{withoutCoordinates}</strong>
            </article>
          </section>

          <section className="content-panel sites-map-filters">
            <div className="sites-map-filter">
              <label htmlFor="sites-map-search">
                جست‌وجوی سایت
              </label>
              <input
                id="sites-map-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="نام سایت یا نوع چک‌لیست..."
              />
            </div>

            <div className="sites-map-filter">
              <label htmlFor="sites-map-type">
                نوع چک‌لیست
              </label>
              <select
                id="sites-map-type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">همه انواع</option>
                {types.map((type) => (
                  <option
                    key={type.id ?? type.checklist_type_id}
                    value={type.id ?? type.checklist_type_id}
                  >
                    {type.name ?? type.type_name ?? type.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sites-map-filter-count">
              نمایش {sites.length} سایت روی نقشه
            </div>
          </section>

          {sites.length === 0 ? (
            <div className="content-panel empty-state sites-map-empty">
              <h3>موقعیتی برای نمایش پیدا نشد.</h3>
              <p>
                ممکن است مختصات ذخیره نشده باشد یا ساختار داده‌های
                دریافتی از API با ساختار فعلی متفاوت باشد.
              </p>
            </div>
          ) : (
            <section className="sites-map-layout">
              <div className="content-panel sites-map-container">
                <MapContainer
                  center={[
                    sites[0].coordinates.latitude,
                    sites[0].coordinates.longitude,
                  ]}
                  zoom={6}
                  scrollWheelZoom
                  className="sites-leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapBoundsUpdater sites={sites} />

                  {sites.map((site) => (
                    <CircleMarker
                      key={site.id}
                      center={[
                        site.coordinates.latitude,
                        site.coordinates.longitude,
                      ]}
                      radius={8}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 2,
                        fillColor: '#2563eb',
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <div className="site-map-popup" dir="rtl">
                          <strong>{site.siteName}</strong>
                          <p>نوع: {site.typeName}</p>
                          <p>وضعیت: {site.status || 'نامشخص'}</p>
                          <p>
                            منبع مختصات: {site.coordinates.source}
                          </p>
                          <p>
                            عرض جغرافیایی:{' '}
                            {site.coordinates.latitude}
                          </p>
                          <p>
                            طول جغرافیایی:{' '}
                            {site.coordinates.longitude}
                          </p>

                          <a
                            href={`https://www.google.com/maps?q=${site.coordinates.latitude},${site.coordinates.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            مشاهده در Google Maps
                          </a>

                          {site.id && (
                            <div>
                              <Link
                                to={`/checklists/${encodeURIComponent(site.id)}`}
                              >
                                مشاهده چک‌لیست
                              </Link>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>

              <aside className="content-panel sites-map-list">
                <h2>سایت‌های روی نقشه</h2>

                {sites.map((site) => (
                  <article className="sites-map-list-item" key={site.id}>
                    <strong>{site.siteName}</strong>
                    <span>{site.typeName}</span>
                    <small>
                      {site.coordinates.latitude},{' '}
                      {site.coordinates.longitude}
                    </small>
                    <a
                      href={`https://www.google.com/maps?q=${site.coordinates.latitude},${site.coordinates.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      باز کردن نقشه
                    </a>
                  </article>
                ))}
              </aside>
            </section>
          )}
        </>
      )}
    </div>
  )
}
