#!/usr/bin/env node
/**
 * Copy guard: fails the build if an em dash (U+2014) appears anywhere in the
 * app source. Brand copy never uses them; use a full stop, comma or colon.
 *
 *   node scripts/check-copy.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["src", "scripts", "e2e"];
const EXT = new Set([".ts", ".tsx", ".mjs", ".js", ".css", ".md"]);
const EM_DASH = String.fromCharCode(0x2014);
const SELF = path.normalize("scripts/check-copy.mjs");
const offenders = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXT.has(path.extname(entry.name)) && path.normalize(full) !== SELF) {
      const lines = fs.readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes(EM_DASH)) offenders.push(`${full}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
  }
}
for (const root of ROOTS) if (fs.existsSync(root)) walk(root);

if (offenders.length) {
  console.error(`Em dashes are not allowed in app copy (${offenders.length} found):\n` + offenders.join("\n"));
  process.exit(1);
}
console.log("check-copy: no em dashes in src/, scripts/, e2e/");
