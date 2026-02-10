#!/usr/bin/env node
import fs from "node:fs";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: node scripts/validate-branch-cleanup-receipt.mjs <receipt.json>");
  process.exit(0);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function hasStr(o, k) {
  if (typeof o[k] !== "string" || o[k].length === 0) fail(`Expected string ${k}`);
}

function hasBool(o, k) {
  if (typeof o[k] !== "boolean") fail(`Expected boolean ${k}`);
}

function hasNum(o, k) {
  if (typeof o[k] !== "number" || !Number.isFinite(o[k])) fail(`Expected number ${k}`);
}

function validateEvidenceList(list, name) {
  if (!Array.isArray(list)) fail(`Expected ${name} to be an array`);
  for (const it of list) {
    if (!isObj(it)) fail(`${name} entries must be objects`);
    hasStr(it, "Name");
    hasStr(it, "Sha");
  }
}

function validateReceiptBase(r) {
  if (!isObj(r)) fail("Receipt must be an object");

  hasStr(r, "RunId");
  hasStr(r, "ScriptHash");

  // RepoHeadSha can be null/undefined if git isn't available
  if (r.RepoHeadSha != null && typeof r.RepoHeadSha !== "string") {
    fail("RepoHeadSha must be string or null/undefined");
  }

  hasStr(r, "Prefix");
  hasBool(r, "WhatIf");
  hasBool(r, "Force");
  hasBool(r, "Quiet");
  if (r.OutJson != null && typeof r.OutJson !== "string") {
    fail("OutJson must be string or null/undefined");
  }
  hasBool(r, "IncludeEvidence");

  hasNum(r, "Kept");
  hasNum(r, "Deleted");
  hasNum(r, "WouldDelete");
  hasNum(r, "SkippedDivergent");
  hasNum(r, "SkippedNotConfirmed");

  // Evidence is optional unless IncludeEvidence=true
  const hasAnyEvidence = "DeletedBranches" in r || "WouldDeleteBranches" in r;
  if (r.IncludeEvidence) {
    if (!("DeletedBranches" in r) || !("WouldDeleteBranches" in r)) {
      fail("IncludeEvidence=true requires DeletedBranches and WouldDeleteBranches");
    }
    validateEvidenceList(r.DeletedBranches, "DeletedBranches");
    validateEvidenceList(r.WouldDeleteBranches, "WouldDeleteBranches");
  } else {
    // If evidence fields exist anyway, validate them (don’t allow garbage)
    if (hasAnyEvidence) {
      if ("DeletedBranches" in r) validateEvidenceList(r.DeletedBranches, "DeletedBranches");
      if ("WouldDeleteBranches" in r) validateEvidenceList(r.WouldDeleteBranches, "WouldDeleteBranches");
    }
  }
}

function validatePrefixReceipt(r) {
  validateReceiptBase(r);
}

function validateRunReceipt(r) {
  validateReceiptBase(r);

  if (!Array.isArray(r.Groups)) fail("Run receipt must include Groups array");
  if (!isObj(r.Totals)) fail("Run receipt must include Totals object");

  for (const g of r.Groups) validatePrefixReceipt(g);

  const t = r.Totals;
  hasNum(t, "Kept");
  hasNum(t, "Deleted");
  hasNum(t, "WouldDelete");
  hasNum(t, "SkippedDivergent");
  hasNum(t, "SkippedNotConfirmed");
}

const file = process.argv[2];
if (!file) {
  fail("Usage: node scripts/validate-branch-cleanup-receipt.mjs <path-to-receipt.json>");
}

const raw = fs.readFileSync(file, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch {
  fail("Invalid JSON");
}

if (isObj(data) && Array.isArray(data.Groups) && isObj(data.Totals)) {
  validateRunReceipt(data);
  console.log("✅ Valid run receipt");
} else {
  validatePrefixReceipt(data);
  console.log("✅ Valid prefix receipt");
}
