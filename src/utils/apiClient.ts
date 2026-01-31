import { logger } from './logging';

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface APIResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

class APIClient {
  private baseURL: string;
  private defaultTimeout = 30000;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: APIResponse<any>) => APIResponse<any>> = [];

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: APIResponse<any>) => APIResponse<any>) {
    this.responseInterceptors.push(interceptor);
  }

  private async executeRequest<T>(url: string, config: RequestConfig): Promise<APIResponse<T>> {
    let finalConfig = { ...config };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      finalConfig = interceptor(finalConfig);
    }

    const fullURL = `${this.baseURL}${url}`;
    logger.debug('API Request', { url: fullURL, method: finalConfig.method });

    try {
      const response = await fetch(fullURL, {
        method: finalConfig.method || 'GET',
        headers: finalConfig.headers,
        body: finalConfig.body ? JSON.stringify(finalConfig.body) : undefined,
        signal: AbortSignal.timeout(finalConfig.timeout || this.defaultTimeout),
      });

      const data = await response.json();
      const apiResponse: APIResponse<T> = {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers),
      };

      // Apply response interceptors
      let finalResponse = apiResponse;
      for (const interceptor of this.responseInterceptors) {
        finalResponse = interceptor(finalResponse);
      }

      logger.debug('API Response', { status: response.status, url: fullURL });
      return finalResponse;
    } catch (error) {
      logger.error('API Error', error instanceof Error ? error : { error });
      throw error;
    }
  }

  get<T>(url: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, { ...config, method: 'GET' });
  }

  post<T>(url: string, body?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, { ...config, method: 'POST', body });
  }

  put<T>(url: string, body?: any, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, { ...config, method: 'PUT', body });
  }

  delete<T>(url: string, config?: RequestConfig): Promise<APIResponse<T>> {
    return this.executeRequest<T>(url, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new APIClient(import.meta.env.VITE_API_URL || '');
