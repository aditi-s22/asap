/**
 * Global input sanitization middleware to prevent XSS vectors.
 * Recursively strips HTML tags from request body, query, and parameters.
 */
const sanitizeXSS = (val) => {
  if (typeof val === "string") {
    // Strip HTML tags using regex to prevent script injection
    return val.replace(/<[^>]*>/g, "");
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeXSS);
  }
  if (val && typeof val === "object") {
    for (const key in val) {
      val[key] = sanitizeXSS(val[key]);
    }
  }
  return val;
};

const xssMiddleware = (req, res, next) => {
  if (req.body) req.body = sanitizeXSS(req.body);
  if (req.query) req.query = sanitizeXSS(req.query);
  if (req.params) req.params = sanitizeXSS(req.params);
  next();
};

module.exports = xssMiddleware;
