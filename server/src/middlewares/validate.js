export function validateRequest(schema, target = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
