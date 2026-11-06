export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [details];
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = [], code = 'BAD_REQUEST') {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = [], code = 'UNAUTHORIZED') {
    super(message, 401, code, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = [], code = 'FORBIDDEN') {
    super(message, 403, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = [], code = 'NOT_FOUND') {
    super(message, 404, code, details);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Resource is no longer available', details = [], code = 'RESOURCE_GONE') {
    super(message, 410, code, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details = [], code = 'CONFLICT') {
    super(message, 409, code, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests, please try again later',
    details = [],
    code = 'RATE_LIMIT_EXCEEDED'
  ) {
    super(message, 429, code, details);
  }
}
