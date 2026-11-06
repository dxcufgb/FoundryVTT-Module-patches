/**
 * Optional integration with Dxcufgb's Debug Recorder (dxcufgbs-debug-recorder).
 *
 * The recorder is NOT a dependency: when it is missing, inactive or broken, everything here does
 * nothing and the patches work exactly as without it. When it is there, this module registers a
 * snapshot of its runtime state and leaves breadcrumbs at the patches' main actions while the GM
 * records.
 *
 * Privacy: snapshots and breadcrumbs hold only counts, booleans and this module's own patch keys.
 * Never names (users, actors, tokens, windows' titles), copied text, positions, paths or URLs.
 */

import { MODULE_ID } from "./main.js";

const RECORDER_ID = "dxcufgbs-debug-recorder";

/** The recorder's API once this module is registered with it. */
let recorder = null;
let snapshotFn = null;

/** Errors the patches caught after `ready`, per patch key. */
const runtimeErrors = {};

/**
 * Leave a breadcrumb (only while the recorder is recording).
 * @param {string} key    dot-namespaced, e.g. "rulerMove.move"
 * @param {object} [data] small, flat object without names or text
 */
export function crumb(key, data) {
  try {
    if (recorder?.isRecording?.()) recorder.breadcrumb(MODULE_ID, key, data);
  } catch (err) {
    console.warn(`${MODULE_ID} | debug recorder breadcrumb failed`, err);
  }
}

/** Count an error a patch caught at runtime and leave a breadcrumb for it. */
export function noteError(patchKey) {
  runtimeErrors[patchKey] = (runtimeErrors[patchKey] ?? 0) + 1;
  crumb("patch.error", { patch: patchKey });
}

/** Copy of the runtime error counts, for the snapshot. */
export function errorCounts() {
  return { ...runtimeErrors };
}

function snapshot() {
  if (!snapshotFn) return { ready: false };
  try {
    return snapshotFn() ?? {};
  } catch (err) {
    console.warn(`${MODULE_ID} | debug recorder snapshot failed`, err);
    return { snapshotError: true };
  }
}

/**
 * Register with the recorder once, whichever of its ready hook or the fallback comes first. The recorder is only
 * kept when register() succeeds (it returns false on failure), so the fallback on "ready" can try again.
 */
function connect(rec) {
  if (recorder || typeof rec?.register !== "function") return;
  try {
    if (rec.register(MODULE_ID, { snapshot }) !== false) recorder = rec;
  } catch (err) {
    console.warn(`${MODULE_ID} | debug recorder registration failed`, err);
  }
}

// Listen from import time, so the recorder's ready hook is never missed whatever the load order.
Hooks.once(`${RECORDER_ID}.ready`, rec => connect(rec));

/**
 * Set the snapshot function and register with the recorder if its API is already there (it became
 * ready before this module's code ran). Called on "ready".
 * @param {{snapshot: () => object}} options
 */
export function registerDebugRecorder({ snapshot: fn } = {}) {
  if (typeof fn === "function") snapshotFn = fn;
  try {
    const mod = game.modules.get(RECORDER_ID);
    if (mod?.active && mod.api) connect(mod.api);
  } catch (err) {
    console.warn(`${MODULE_ID} | debug recorder lookup failed`, err);
  }
}
