import express from "express";

import { validateBody } from "../middleware/validate_body.mjs";
import { scheduleContent, getCalendar, scheduleOnBestTime } from "../controllers/schedule_controller.mjs";

export function scheduleRoutes() {
  const r = express.Router();

  r.post("/schedule", validateBody("ScheduleRequest"), scheduleContent);
  r.post("/schedule/best-time", validateBody("ScheduleOnBestTimeRequest"), scheduleOnBestTime);
  r.get("/calendar", getCalendar);

  return r;
}
