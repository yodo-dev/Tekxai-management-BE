export function not_found_handler(req, res) {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

export function error_handler(err, req, res, next) {
  const status_code = err.status_code || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  return res.status(status_code).json({
    success: false,
    message: err.message || "Internal server error",
  });
}
