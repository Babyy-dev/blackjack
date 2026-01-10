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
    const message =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail?: string }).detail)
        : `Request failed with status ${response.status}`
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
    const message =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as { detail?: string }).detail)
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data as T
}

export const apiBaseUrl = API_BASE_URL
