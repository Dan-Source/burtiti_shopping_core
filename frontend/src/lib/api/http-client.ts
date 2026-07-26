import { ApiError, reportApiError } from "@/lib/api/errors";

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number | boolean>
>;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestMetadata = {
  skipAuth?: boolean;
  skipCsrf?: boolean;
  source?: string;
  retried?: boolean;
};

export type RequestContext = {
  url: string;
  init: RequestInit;
  metadata?: RequestMetadata;
};

export type ResponseContext = {
  request: RequestContext;
  response: Response;
};

export type RequestInterceptor =
  | ((context: RequestContext) => RequestContext)
  | ((context: RequestContext) => Promise<RequestContext>);

export type ResponseInterceptor =
  | ((context: ResponseContext) => ResponseContext)
  | ((context: ResponseContext) => Promise<ResponseContext>);

export type RequestOptions = {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  metadata?: RequestMetadata;
  signal?: AbortSignal;
};

type HttpClientConfig = {
  baseUrl: string;
  timeoutMs?: number;
};

function toHeaders(input?: HeadersInit): Headers {
  return new Headers(input || {});
}

function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const target = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  if (!query) {
    return target.toString();
  }

  Object.entries(query).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      return;
    }

    if (Array.isArray(rawValue)) {
      rawValue.forEach((item) => target.searchParams.append(key, String(item)));
      return;
    }

    target.searchParams.set(key, String(rawValue));
  });

  return target.toString();
}

async function parseErrorResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs || 15000;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = toHeaders(options.headers);
    const isFormData = options.body instanceof FormData;

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let requestContext: RequestContext = {
      url: buildUrl(this.baseUrl, path, options.query),
      init: {
        method: options.method || "GET",
        headers,
        credentials: "include",
        body: isFormData
          ? (options.body as FormData)
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
        signal: options.signal || controller.signal,
      },
      metadata: options.metadata,
    };

    try {
      for (const interceptor of this.requestInterceptors) {
        requestContext = await interceptor(requestContext);
      }

      let response = await fetch(requestContext.url, requestContext.init);
      let responseContext: ResponseContext = {
        request: requestContext,
        response,
      };

      for (const interceptor of this.responseInterceptors) {
        responseContext = await interceptor(responseContext);
      }

      response = responseContext.response;

      if (!response.ok) {
        const data = await parseErrorResponse(response);

        throw new ApiError(`Request failed with status ${response.status}`, {
          status: response.status,
          url: requestContext.url,
          data,
          details:
            typeof data === "object" && data !== null && "detail" in data
              ? (data as { detail: unknown }).detail
              : undefined,
        });
      }

      return parseResponse<T>(response);
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError("Network request failed", {
              status: 0,
              url: requestContext.url,
              details: error,
            });

      reportApiError(apiError, requestContext.metadata?.source);
      throw apiError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...options, method: "POST" });
  }

  put<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...options, method: "PUT" });
  }

  patch<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(path, { ...options, method: "PATCH" });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export function createHttpClient(config: HttpClientConfig) {
  return new HttpClient(config);
}
