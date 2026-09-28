/**
 * Dxcufgb's patches (dxcufgbs-patches) - Foundry VTT V13
 * Entry point: registers a setting per patch and applies the enabled ones.
 */

import * as popoutCopy from "./patches/popout-copy.js";
import * as popoutRollDialogs from "./patches/popout-roll-dialogs.js";

export const MODULE_ID = "dxcufgbs-patches";

/**
 * All patches. Each has: key (on/off setting), module (id of patched module or null), apply(),
 * and optionally settings: [{ key, type, default }] for extra options shown under it.
 */
const PATCHES = [popoutCopy, popoutRollDialogs];

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
        config: true,
        type: extra.type ?? Boolean,
        default: extra.default ?? true
      });
    }
  }
});

Hooks.once("ready", () => {
  for (const patch of PATCHES) {
    if (!game.settings.get(MODULE_ID, patch.key)) continue;
    if (patch.module && !game.modules.get(patch.module)?.active) continue;
    try {
      patch.apply();
      console.log(`${MODULE_ID} | applied patch "${patch.key}"`);
    } catch (err) {
      console.error(`${MODULE_ID} | patch "${patch.key}" failed`, err);
    }
  }
});
