export function errorHandler() {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      ok: false,
      request_id: req.request_id,
      error: err.message || "Internal error",
      details: err.details || undefined
    });
  };
}
