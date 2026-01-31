#!/usr/bin/env node

/**
 * Validates all Notion schema files in notion/schemas/
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemasDir = join(__dirname, '../notion/schemas');

console.log('🔍 Validating Notion schemas...\n');

const schemaFiles = readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));

let hasErrors = false;

for (const file of schemaFiles) {
  const filePath = join(schemasDir, file);
  
  try {
    const content = readFileSync(filePath, 'utf8');
    
    // Skip empty files
    if (content.trim() === '') {
      console.log(`⚪ ${file} - EMPTY (skipped)`);
      continue;
    }
    
    const schema = JSON.parse(content);
    
    // Basic validation - check for required JSON Schema properties
    if (!schema.$schema) {
      console.log(`⚠️  ${file} - Missing $schema property`);
      hasErrors = true;
      continue;
    }
    
    if (!schema.title) {
      console.log(`⚠️  ${file} - Missing title property`);
      hasErrors = true;
      continue;
    }
    
    if (!schema.type) {
      console.log(`⚠️  ${file} - Missing type property`);
      hasErrors = true;
      continue;
    }
    
    console.log(`✅ ${file} - VALID (parseable JSON with required fields)`);
  } catch (err) {
    console.log(`❌ ${file} - PARSE ERROR`);
    console.error(`   Error: ${err.message}`);
    hasErrors = true;
  }
}

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('❌ Schema validation FAILED');
  process.exit(1);
} else {
  console.log('✅ All schemas are valid!');
  process.exit(0);
}
