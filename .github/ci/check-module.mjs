// CI checks for this Foundry module. No dependencies: run with `node .github/ci/check-module.mjs`.
//
//  1. module.json is valid and every file it points at exists.
//  2. Every script parses (node --check) and all language files are valid JSON.
//  3. The module can be imported with a stub of Foundry's globals, the "init"
//     hook registers settings under the module id, and every visible setting has
//     its Name and Hint in lang/en.json (missing keys show up raw in Foundry).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const problems = [];
const note = (msg) => console.log(`  ${msg}`);
const fail = (msg) => { problems.push(msg); console.log(`  FAIL ${msg}`); };
const exists = (p) => fs.existsSync(path.join(root, p));

// --- 1. module.json ----------------------------------------------------------------------
console.log("module.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(root, "module.json"), "utf8"));
} catch (err) {
  fail(`module.json is not valid JSON: ${err.message}`);
}
if (manifest) {
  for (const field of ["id", "title", "description", "version", "compatibility", "esmodules"]) {
    if (manifest[field] === undefined) fail(`module.json is missing "${field}"`);
  }
  if (manifest.compatibility && !manifest.compatibility.minimum) fail("module.json compatibility.minimum is missing");
  if (manifest.compatibility && !manifest.compatibility.verified) fail("module.json compatibility.verified is missing");
  if (manifest.id && !/^[a-z0-9_-]+$/.test(manifest.id)) fail(`module.json id "${manifest.id}" has characters Foundry does not allow`);
  const referenced = [
    ...(manifest.esmodules ?? []),
    ...(manifest.scripts ?? []),
    ...(manifest.styles ?? []),
    ...(manifest.languages ?? []).map((l) => l.path),
    ...(manifest.packs ?? []).map((p) => p.path),
    manifest.license,
  ].filter(Boolean);
  for (const file of referenced) {
    if (!exists(file)) fail(`module.json points at "${file}", which does not exist`);
  }
  for (const rel of Object.values(manifest.relationships ?? {}).flat()) {
    if (!rel.id || !rel.type) fail(`module.json relationship ${JSON.stringify(rel)} needs an id and a type`);
  }
  note(`id ${manifest.id}, version ${manifest.version}, Foundry ${manifest.compatibility?.minimum}–${manifest.compatibility?.verified}, ${referenced.length} referenced files present`);
}

// --- 2. scripts parse, language files are JSON -------------------------------------------------
console.log("scripts");
function walk(dir, ext) {
  if (!exists(dir)) return [];
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const p = path.posix.join(dir, e.name);
    return e.isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
  });
}
const scripts = walk("scripts", ".js");
if (!scripts.length) fail("no scripts found under scripts/");
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ["--check", file], { cwd: root, stdio: "pipe" });
  } catch (err) {
    fail(`${file} does not parse:\n${err.stderr?.toString() ?? err.message}`);
  }
}
note(`${scripts.length} script(s) parse`);

console.log("languages");
const langs = {};
for (const lang of manifest?.languages ?? []) {
  try {
    langs[lang.lang] = JSON.parse(fs.readFileSync(path.join(root, lang.path), "utf8"));
    note(`${lang.path} (${lang.lang}) is valid JSON`);
  } catch (err) {
    fail(`${lang.path} is not valid JSON: ${err.message}`);
  }
}
if (manifest && !langs.en) fail("module.json has no English language file");

// --- 3. import the module with stubbed Foundry globals ------------------------------------------
console.log("import with stubbed Foundry globals");
const hooks = {};
const registered = [];
globalThis.Hooks = {
  once: (name, fn) => { (hooks[name] ??= []).push(fn); },
  on: (name, fn) => { (hooks[name] ??= []).push(fn); return 1; },
  off: () => {},
  call: () => true,
  callAll: () => true,
};
globalThis.game = {
  settings: { register: (ns, key, data) => registered.push({ ns, key, data }), registerMenu: () => {}, get: () => true, set: async () => {} },
  modules: { get: () => undefined },
  i18n: { localize: (s) => s, format: (s) => s, has: () => true },
  user: { isGM: true },
};
globalThis.foundry = { utils: {}, applications: { api: {} } };
globalThis.CONFIG = {};
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
globalThis.canvas = {};
globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, removeEventListener() {}, body: {} };

let mod;
for (const entry of manifest?.esmodules ?? []) {
  try {
    mod = await import(pathToFileURL(path.join(root, entry)).href);
    note(`${entry} imported`);
  } catch (err) {
    fail(`${entry} failed to import: ${err.stack ?? err}`);
  }
}
if (mod) {
  if (manifest && mod.MODULE_ID !== manifest.id) fail(`MODULE_ID "${mod.MODULE_ID}" differs from module.json id "${manifest.id}"`);
  for (const fn of hooks.init ?? []) {
    try {
      await fn();
    } catch (err) {
      fail(`an "init" hook threw: ${err.stack ?? err}`);
    }
  }
  if (!registered.length) fail('the "init" hook registered no settings');
  const lookup = (obj, dotted) => dotted.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
  const seen = new Set();
  for (const { ns, key, data } of registered) {
    if (manifest && ns !== manifest.id) fail(`setting "${key}" is registered under "${ns}" instead of "${manifest.id}"`);
    if (seen.has(key)) fail(`setting "${key}" is registered twice`);
    seen.add(key);
    if (data.config === false || !langs.en) continue;
    for (const field of ["name", "hint"]) {
      const value = data[field];
      if (typeof value !== "string") continue;
      if (typeof lookup(langs.en, value) !== "string") fail(`setting "${key}": translation "${value}" is missing from lang/en.json`);
    }
  }
  note(`${registered.length} setting(s) registered, ${registered.filter((r) => r.data.config !== false).length} visible, translations present`);
}

// --- result ----------------------------------------------------------------------------------
console.log();
if (problems.length) {
  console.log(`${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log("All checks passed.");
