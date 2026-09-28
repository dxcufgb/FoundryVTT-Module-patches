/**
 * Patch: PopOut! - keep roll dialogs in the main window.
 *
 * Why they end up in the popped-out window:
 *   Whenever a new window opens, PopOut! calls PopoutModule#handleChildDialog(app).
 *   If the new window looks like it belongs to a popped-out sheet (it has the
 *   same actor, or the popout was clicked in the last second and the window's
 *   class name contains "Dialog", "Config" or "Roll"), PopOut! moves it into that
 *   separate window. Roll dialogs opened from a popped-out character sheet match
 *   all of these, so they appear next to the sheet instead of in Foundry.
 *
 * Fix:
 *   Wrap handleChildDialog. For roll dialogs (and optionally item/spell usage
 *   dialogs) it returns "not handled", so PopOut! leaves the dialog where Foundry
 *   rendered it: the main window. Optionally the main window is brought to the
 *   front so the dialog is seen right away.
 */

import { MODULE_ID } from "../main.js";

export const key = "PopoutRollDialogs";
export const module = "popout";

/** Extra settings shown under this patch (registered by main.js). */
export const settings = [
  { key: "PopoutRollDialogsUsage", type: Boolean, default: true },
  { key: "PopoutRollDialogsFocus", type: Boolean, default: true }
];

// Classes (anywhere in the class chain) that count as roll dialogs.
const ROLL_CLASSES = new Set([
  "RollConfigurationDialog",   // dnd5e: attack, damage, ability check, save, skill, tool, ...
  "RollResolver"               // core: manual dice entry
]);
// Classes that count as "using an item / casting a spell" dialogs.
const USAGE_CLASSES = new Set(["ActivityUsageDialog"]);

function classChain(app) {
  const names = [];
  let c = app?.constructor;
  while (c && c !== Object && c !== Function.prototype && names.length < 20) {
    if (c.name) names.push(c.name);
    c = Object.getPrototypeOf(c);
  }
  return names;
}

function isRollDialog(names) {
  if (names.some(n => ROLL_CLASSES.has(n))) return true;
  // Other systems/modules: e.g. "RollDialog", "RollPrompt", "D20RollConfig"
  return names.some(n => /Roll/.test(n) && /(Dialog|Config|Prompt|Resolver)/.test(n));
}

function shouldStayInMain(app) {
  const names = classChain(app);
  if (isRollDialog(names)) return true;
  if (game.settings.get(MODULE_ID, "PopoutRollDialogsUsage") && names.some(n => USAGE_CLASSES.has(n))) return true;
  return false;
}

function bringMainWindowForward(app) {
  if (!game.settings.get(MODULE_ID, "PopoutRollDialogsFocus")) return;
  try {
    window.focus();
    app?.bringToFront?.();      // ApplicationV2
    app?.bringToTop?.();        // ApplicationV1
  } catch (_) { /* focusing is best effort */ }
}

export function apply() {
  // PopOut! is a classic script, so its class is a global binding (not on window).
  const PM = typeof PopoutModule !== "undefined" ? PopoutModule : null;   // eslint-disable-line no-undef
  if (!PM?.prototype?.handleChildDialog) throw new Error("PopoutModule#handleChildDialog not found");

  const original = PM.prototype.handleChildDialog;
  if (original.__dxpRollDialogs) return;

  const patched = function (app) {
    try {
      if (shouldStayInMain(app)) {
        bringMainWindowForward(app);
        return false;             // not a child dialog: PopOut! leaves it in the main window
      }
    } catch (err) {
      console.error(`${MODULE_ID} | PopoutRollDialogs`, err);
    }
    return original.call(this, app);
  };
  patched.__dxpRollDialogs = true;
  PM.prototype.handleChildDialog = patched;

  // In case PopOut! put an own-property copy on its instance.
  const inst = PM.singleton;
  if (inst && Object.prototype.hasOwnProperty.call(inst, "handleChildDialog")) inst.handleChildDialog = patched;
}
