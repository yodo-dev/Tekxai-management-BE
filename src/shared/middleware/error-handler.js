export function not_found_handler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

export function error_handler(err, req, res, next) {
  const status_code = err.status_code || 500;

  // Always log server-side so production failures are visible in pm2 logs;
  // the client response below still only ever exposes err.message, never the stack.
  console.error(err);

  return res.status(status_code).json({
    success: false,
    message: err.message || "Internal server error",
    // Additive, optional — only present when the throwing call site used
    // field_error() to attach a machine-readable field/code (e.g. duplicate
    // email, missing required field), so a form can locate the exact input.
    ...(err.field ? { field: err.field } : {}),
    ...(err.code ? { code: err.code } : {}),
  });
}
