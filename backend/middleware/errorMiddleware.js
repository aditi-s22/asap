const ApiError = require("../utils/ApiError");

/**
 * Centralized error handler middleware.
 * Intercepts all next(err) calls and sends standardized JSON responses.
 */
const errorMiddleware = (err, req, res, next) => {
  let { statusCode, message, errors } = err;

  // If it is not an instance of ApiError, default to 500
  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || err.status || 500;
    message = err.message || "An unexpected error occurred on the server.";
    errors = [];
  }

  // Securely mask stack traces in production
  const isDev = process.env.NODE_ENV === "development";

  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.url} - Status: ${statusCode} - Message: ${message}`, isDev ? err.stack : "");

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: isDev ? err.stack : undefined
  });
};

module.exports = errorMiddleware;
