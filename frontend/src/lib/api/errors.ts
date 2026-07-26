export type ApiErrorDetails = {
  code?: string;
  status: number;
  url?: string;
  details?: unknown;
  data?: unknown;
};

export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly url?: string;
  readonly details?: unknown;
  readonly data?: unknown;

  constructor(message: string, error: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status;
    this.url = error.url;
    this.details = error.details;
    this.data = error.data;
  }
}

type ApiErrorHandler = (error: ApiError, source?: string) => void;

let globalApiErrorHandler: ApiErrorHandler | null = null;

export function setGlobalApiErrorHandler(handler: ApiErrorHandler) {
  globalApiErrorHandler = handler;
}

export function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message, { status: fallbackStatus, details: error });
  }

  return new ApiError("Unexpected API error", {
    status: fallbackStatus,
    details: error,
  });
}

export function reportApiError(error: unknown, source?: string) {
  const apiError = toApiError(error);

  if (globalApiErrorHandler) {
    globalApiErrorHandler(apiError, source);
    return;
  }

  console.error(`[api:${source || "unknown"}]`, apiError);
}
