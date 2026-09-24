/**
 * Dxcufgb's patches (dxcufgbs-patches) - Foundry VTT V13
 * Entry point: registers a setting per patch and applies the enabled ones.
 */

import * as popoutCopy from "./patches/popout-copy.js";

export const MODULE_ID = "dxcufgbs-patches";

/** All patches. Each has: key (setting name), module (id of patched module or null), apply(). */
const PATCHES = [popoutCopy];

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
