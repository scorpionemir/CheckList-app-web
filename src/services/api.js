const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const TOKEN_KEY = 'checklist_web_token'
const USER_KEY = 'checklist_web_user'

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('آدرس API در فایل .env تنظیم نشده است.')
  }

  const { headers = {}, ...restOptions } = options
  const token = localStorage.getItem(TOKEN_KEY)

  const requestHeaders = {
    Accept: 'application/json',
    ...(restOptions.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: requestHeaders,
    })
  } catch {
    throw new Error(
      'ارتباط با سرور برقرار نشد. اتصال اینترنت و وضعیت سرور را بررسی کنید.',
    )
  }

  const contentType = response.headers.get('content-type') || ''
  let result = null

  if (contentType.includes('application/json')) {
    result = await response.json().catch(() => null)
  } else {
    result = await response.text().catch(() => '')
  }

  if (!response.ok) {
    const message =
      result && typeof result === 'object'
        ? result.message || result.error
        : null

    const error = new Error(
      message || `درخواست با خطای ${response.status} مواجه شد.`,
    )

    error.status = response.status

    // پاک‌کردن اطلاعات احراز هویت در صورت نامعتبر بودن یا انقضای توکن
    if (response.status === 401 && token) {
      clearAuth()
      error.authExpired = true
    }

    throw error
  }

  return result
}

export async function loginRequest(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      ...credentials,
      clientType: 'web',
    }),
  })
}

export function getCurrentUser() {
  return apiRequest('/api/auth/me')
}

export function getUsers() {
  return apiRequest('/api/users')
}

export function createUser(userData) {
  return apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

export async function deactivateUser(userId) {
  if (!userId) {
    throw new Error('شناسه کاربر مشخص نیست.')
  }

  return apiRequest(
    `/api/users/${encodeURIComponent(userId)}/deactivate`,
    {
      method: 'PATCH',
    },
  )
}

export function getChecklistById(checklistId) {
  return apiRequest(`/api/checklists/${encodeURIComponent(checklistId)}`)
}

export function getAllSubmittedChecklists() {
  return apiRequest('/api/checklists/manager/all')
}