// PostToolUse hook: syntax-check edited .js (as an ES module) and .json files.
// Exit 2 feeds the error back to Claude. There is no build step, so this is the only early check.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const file = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path ?? "";
if (!/\.(js|json)$/.test(file)) process.exit(0);

try {
  if (file.endsWith(".json")) {
    JSON.parse(readFileSync(file, "utf8"));
  } else {
    // node treats .js as CommonJS here (no package.json), so check a .mjs copy
    const tmp = join(tmpdir(), `syntax-check-${process.pid}.mjs`);
    writeFileSync(tmp, readFileSync(file));
    try {
      execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    } finally {
      rmSync(tmp, { force: true });
    }
  }
} catch (err) {
  console.error(`Syntax error in ${file}:\n${err.stderr?.toString() || err.message}`);
  process.exit(2);
}
