// Express 4 does not catch a rejected promise from an async route handler
// — the request just hangs and the error is lost. Wrapping every async
// handler with this forwards the failure to the error handler, so the
// client always gets a JSON answer instead of silence.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
