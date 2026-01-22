import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSchemaJson(relPath) {
  const abs = path.resolve(__dirname, relPath);
  const raw = await fs.readFile(abs, "utf8");
  return JSON.parse(raw);
}

const [createContentSchema, approveSchema, scheduleSchema, scheduleBestTimeSchema] = await Promise.all([
  readSchemaJson("./create_content.schema.json"),
  readSchemaJson("./approve_content.schema.json"),
  readSchemaJson("./schedule.schema.json"),
  readSchemaJson("./schedule_on_best_time.schema.json")
]);

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const schemas = [createContentSchema, approveSchema, scheduleSchema, scheduleBestTimeSchema];

for (const schema of schemas) {
  try {
    ajv.compile(schema);
  } catch (e) {
    console.error("Schema failed to compile:");
    console.error(schema.$id);
    console.error(e);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`Ajv compiled ${schemas.length} request schemas successfully.`);
}
