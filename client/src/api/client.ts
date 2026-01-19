export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(
  /\/$/,
  '',
)

const extractErrorMessage = (data: unknown, status: number) => {
  if (typeof data === 'string') return data

  if (data && typeof data === 'object') {
    if ('detail' in data) {
      const detail = (data as { detail?: unknown }).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => {
            if (!item) return ''
            if (typeof item === 'string') return item
            if (typeof item === 'object') {
              if ('msg' in item && typeof item.msg === 'string') return item.msg
              if ('message' in item && typeof item.message === 'string') return item.message
              try {
                return JSON.stringify(item)
              } catch {
                return ''
              }
            }
            return String(item)
          })
          .filter(Boolean)
          .join(', ')
        if (messages) return messages
      } else if (detail && typeof detail === 'object') {
        if ('msg' in detail && typeof detail.msg === 'string') return detail.msg
        if ('message' in detail && typeof detail.message === 'string') return detail.message
        try {
          return JSON.stringify(detail)
        } catch {
          return `Request failed with status ${status}`
        }
      }
    }
    if ('message' in data && typeof data.message === 'string') return data.message
  }

  return `Request failed with status ${status}`
}

export const buildApiUrl = (path: string) => {
  if (path.startsWith('http')) return path
  return `${API_BASE_URL}${path}`
}

export async function request<T>(
  path: string,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options
  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  })

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = extractErrorMessage(data, response.status)
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export async function requestForm<T>(
  path: string,
  formData: FormData,
  options: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers, ...rest } = options
  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: formData,
  })

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message = extractErrorMessage(data, response.status)
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export const apiBaseUrl = API_BASE_URL
