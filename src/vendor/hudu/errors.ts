/**
 * Custom error classes for the Hudu client
 */

export class HuduError extends Error {
  readonly statusCode: number;
  readonly response: unknown;

  constructor(message: string, statusCode: number = 0, response?: unknown) {
    super(message);
    this.name = 'HuduError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, HuduError.prototype);
  }
}

export class HuduAuthenticationError extends HuduError {
  constructor(message: string, statusCode: number = 401, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'HuduAuthenticationError';
    Object.setPrototypeOf(this, HuduAuthenticationError.prototype);
  }
}

export class HuduForbiddenError extends HuduError {
  constructor(message: string, response?: unknown) {
    super(message, 403, response);
    this.name = 'HuduForbiddenError';
    Object.setPrototypeOf(this, HuduForbiddenError.prototype);
  }
}

export class HuduNotFoundError extends HuduError {
  constructor(message: string, response?: unknown) {
    super(message, 404, response);
    this.name = 'HuduNotFoundError';
    Object.setPrototypeOf(this, HuduNotFoundError.prototype);
  }
}

export class HuduValidationError extends HuduError {
  readonly errors: Array<{ field: string; message: string }>;

  constructor(message: string, errors: Array<{ field: string; message: string }> = [], response?: unknown) {
    super(message, 400, response);
    this.name = 'HuduValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, HuduValidationError.prototype);
  }
}

export class HuduRateLimitError extends HuduError {
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 5000, response?: unknown) {
    super(message, 429, response);
    this.name = 'HuduRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, HuduRateLimitError.prototype);
  }
}

export class HuduServerError extends HuduError {
  constructor(message: string, statusCode: number = 500, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'HuduServerError';
    Object.setPrototypeOf(this, HuduServerError.prototype);
  }
}
