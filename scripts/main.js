/**
 * Dxcufgb's patches (dxcufgbs-patches) - Foundry VTT V13
 * Entry point: registers a setting per patch and applies the enabled ones.
 */

import * as popoutCopy from "./patches/popout-copy.js";
import * as popoutRollDialogs from "./patches/popout-roll-dialogs.js";
import * as popoutContextMenus from "./patches/popout-context-menus.js";
import * as monksTokenbarPosition from "./patches/monks-tokenbar-position.js";
import * as monksTokenbarFade from "./patches/monks-tokenbar-fade.js";
import * as rulerMove from "./patches/ruler-move.js";
import { crumb, errorCounts, registerDebugRecorder } from "./debug-recorder.js";

export const MODULE_ID = "dxcufgbs-patches";

/**
 * All patches. Each has: key (on/off setting), module (id of patched module or null), apply(),
 * and optionally settings: [{ key, type, default, config }] for extra options shown under it
 * (config: false keeps a setting out of the menu, e.g. stored data).
 */
const PATCHES = [popoutCopy, popoutRollDialogs, popoutContextMenus, monksTokenbarPosition, monksTokenbarFade, rulerMove];

/** What happened to each patch on `ready`: "off", "targetInactive", "applied" or "failed" (for the debug recorder). */
const patchStatus = {};

Hooks.once("init", () => {
  for (const patch of PATCHES) {
    game.settings.register(MODULE_ID, patch.key, {
      name: `DXP.Settings.${patch.key}.Name`,
      hint: `DXP.Settings.${patch.key}.Hint`,
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });
    for (const extra of patch.settings ?? []) {
      game.settings.register(MODULE_ID, extra.key, {
        name: `DXP.Settings.${extra.key}.Name`,
        hint: `DXP.Settings.${extra.key}.Hint`,
        scope: "client",
        config: extra.config ?? true,
        type: extra.type ?? Boolean,
        default: extra.default ?? true
      });
    }
  }
});

Hooks.once("ready", () => {
  for (const patch of PATCHES) {
    if (!game.settings.get(MODULE_ID, patch.key)) {
      patchStatus[patch.key] = "off";
      continue;
    }
    if (patch.module && !game.modules.get(patch.module)?.active) {
      patchStatus[patch.key] = "targetInactive";
      continue;
    }
    try {
      patch.apply();
      patchStatus[patch.key] = "applied";
      console.log(`${MODULE_ID} | applied patch "${patch.key}"`);
    } catch (err) {
      patchStatus[patch.key] = "failed";
      console.error(`${MODULE_ID} | patch "${patch.key}" failed`, err);
    }
    crumb("patch.apply", { patch: patch.key, status: patchStatus[patch.key] });
  }
  registerDebugRecorder({ snapshot: debugSnapshot });
});

/**
 * Runtime state for Dxcufgb's Debug Recorder (optional, see debug-recorder.js): patch keys, counts and
 * booleans only. Never names, window titles, copied text or positions.
 */
function debugSnapshot() {
  const PM = typeof PopoutModule !== "undefined" ? PopoutModule : null;   // eslint-disable-line no-undef
  const tokenBar = foundry.applications.instances.get("tokenbar");
  const isTokenBar = tokenBar?.constructor?.name === "TokenBar";
  const state = isTokenBar ? tokenBar._dxpPosition : null;
  return {
    patches: { ...patchStatus },
    runtimeErrors: errorCounts(),
    targets: Object.fromEntries(
      [...new Set(PATCHES.map(p => p.module).filter(Boolean))].map(id => [id, !!game.modules.get(id)?.active])
    ),
    // Whether our wrappers are still the installed methods (another module may have replaced them since).
    wrappers: {
      processKeyboardContext: !!game.keyboard?._processKeyboardContext?.__dxpPopoutCopy,
      handleChildDialog: !!PM?.prototype?.handleChildDialog?.__dxpRollDialogs,
      contextMenuFixedPosition: !!foundry.applications.ux?.ContextMenu?.prototype?._setFixedPosition?.__dxpContextMenus
    },
    popout: PM ? { poppedOutWindows: PM.singleton?.poppedOut?.size ?? 0 } : null,
    tokenBar: isTokenBar ? {
      rendered: !!tokenBar.rendered,
      minimized: !!tokenBar.minimized,
      positionPatched: !!state,
      hasSavedPosition: !!state?.pos,
      dragging: !!state?.dragging,
      fadeFixed: !!tokenBar.element?._dxpFadeFixed
    } : null
  };
}
