class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    data = null,
    errors = [],
    stack = "",
    
  ) {
    super();
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.isSuccess = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
