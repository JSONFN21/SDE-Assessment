const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

const normalizedAuthBase = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, '').replace(/\/auth$/, '/auth')
  : '/api/auth';

const normalizedApiBase = normalizedAuthBase.replace(/\/auth$/, '');

export const AUTH_API_BASE_URL = normalizedAuthBase;
export const API_BASE_URL = normalizedApiBase;
