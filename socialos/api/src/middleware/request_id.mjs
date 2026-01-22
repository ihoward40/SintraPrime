import crypto from "node:crypto";

export function requestId() {
  return (req, _res, next) => {
    req.request_id = crypto.randomUUID();
    next();
  };
}
