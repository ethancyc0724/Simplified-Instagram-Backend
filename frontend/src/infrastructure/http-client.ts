/**
 * Infrastructure Layer - HTTP Client
 * Handles HTTP requests, error handling, and interceptors
 */

import { getAuthToken } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Fetch API with error handling and interceptors
 */
export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const timeout = options?.timeout ?? 50000;

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
      clearTimeout(timeoutId);
    });
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    signal: options?.signal || controller.signal,
  };
  delete (fetchOptions as any).timeout;

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = response.statusText || 'An error occurred';
      try {
        const errorText = await response.text();
        if (errorText) {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson?.detail) {
              const detail = errorJson.detail;
              if (typeof detail === 'string') {
                errorMessage = detail;
              } else if (Array.isArray(detail) && detail.length > 0) {
                errorMessage = detail.map((item: any) => 
                  typeof item === 'string' ? item : (item?.msg || String(item))
                ).join(', ');
              } else if (detail != null) {
                errorMessage = String(detail);
              }
            }
          } catch {
            errorMessage = errorText;
          }
        }
      } catch {
        // Use default errorMessage
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(options?.signal?.aborted ? 'Request cancelled' : 'Request timeout');
    }
    throw error;
  }
}
