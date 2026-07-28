export interface AdminRequestError extends Error {
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string>;
  retryable?: boolean;
}

export function mapAdminError(error: unknown) {
  const value = error as Partial<AdminRequestError> | null;
  return {
    root:
      error instanceof Error
        ? error.message
        : "The request failed. Please try again.",
    fields: value?.fieldErrors ?? {},
    retryable: value?.retryable ?? true,
  };
}
