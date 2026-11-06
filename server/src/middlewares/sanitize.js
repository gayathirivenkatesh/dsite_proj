/**
 * NoSQL Injection sanitizer.
 * Recursively strips keys starting with `$` or containing `.`
 * from req.body, req.query, and req.params to prevent MongoDB operator injection.
 */
function sanitizeObject(target) {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item));
  }

  for (const key of Object.keys(target)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete target[key];
    } else {
      target[key] = sanitizeObject(target[key]);
    }
  }

  return target;
}

export function sanitizeInput(req, res, next) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
}
