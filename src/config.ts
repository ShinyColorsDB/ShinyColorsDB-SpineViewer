const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true'

export const API_BASE_URL = USE_PROXY ? '/api' : 'https://api.shinycolors.moe/spine'

export const CF_BASE_URL = USE_PROXY ? '/cf' : 'https://cf-static.shinycolors.moe'

export function getSpineUrl(path: string): string {
  const base = USE_PROXY ? '/spine' : 'https://cf-static.shinycolors.moe/spine'
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}

export const config = {
  useProxy: USE_PROXY,
  apiBaseUrl: API_BASE_URL,
  cfBaseUrl: CF_BASE_URL,
  getSpineUrl,
}
