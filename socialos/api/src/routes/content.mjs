import { Router } from "express";

import { validateBody } from "../middleware/validate_body.mjs";
import { createContent, approveContent, listContent } from "../controllers/content_controller.mjs";

export function contentRoutes() {
  const r = Router();

  r.get("/", listContent);
  r.post("/", validateBody("CreateContentRequest"), createContent);
  r.post("/:id/approve", validateBody("ApproveContentRequest"), approveContent);

  return r;
}
