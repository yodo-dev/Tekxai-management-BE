// Structured validation error — carries a machine-readable `field` + `code`
// alongside the human `message`, so any frontend form can locate the exact
// input a validation failure applies to instead of special-casing one
// hardcoded error string. Backward compatible: `error_handler.js` still
// always sends `message`; `field`/`code` are additive keys only present
// when the throwing call site supplies them.
export function field_error(message, field, code, status_code = 422) {
  const e = new Error(message);
  e.status_code = status_code;
  e.field = field;
  e.code = code;
  return e;
}
