import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSchemaJson(relPath) {
  const abs = path.resolve(__dirname, relPath);
  const raw = await fs.readFile(abs, "utf8");
  return JSON.parse(raw);
}

const [createContentSchema, approveSchema, scheduleSchema, scheduleBestTimeSchema] = await Promise.all([
  readSchemaJson("../schemas/create_content.schema.json"),
  readSchemaJson("../schemas/approve_content.schema.json"),
  readSchemaJson("../schemas/schedule.schema.json"),
  readSchemaJson("../schemas/schedule_on_best_time.schema.json")
]);

const validators = {
  CreateContentRequest: ajv.compile(createContentSchema),
  ApproveContentRequest: ajv.compile(approveSchema),
  ScheduleRequest: ajv.compile(scheduleSchema),
  ScheduleOnBestTimeRequest: ajv.compile(scheduleBestTimeSchema)
};

export function validateBody(schemaName) {
  const validate = validators[schemaName];
  if (!validate) throw new Error(`Unknown schema: ${schemaName}`);

  return (req, _res, next) => {
    const ok = validate(req.body);
    if (!ok) {
      const e = new Error("Validation failed");
      e.statusCode = 400;
      e.details = validate.errors;
      return next(e);
    }
    next();
  };
}
