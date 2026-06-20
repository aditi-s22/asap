/**
 * Observability: Request Logger Middleware.
 * Captures route, method, user ID (if authenticated), response status code, and duration (ms).
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // We read req.user at the finish event, by which time down-stream auth middleware has populated it.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const userId = req.user ? req.user._id.toString() : "anonymous";
    
    // Mask passwords or tokens from URL or logs if needed
    console.log(`[REQUEST] ${new Date().toISOString()} - ${method} ${originalUrl} - User: ${userId} - Status: ${statusCode} - Duration: ${duration}ms`);
  });

  next();
};

module.exports = requestLogger;
