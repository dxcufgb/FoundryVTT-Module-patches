/**
 * Patch: Monk's TokenBar - remember where the token bar was and let it move freely.
 *
 * What goes wrong:
 *   The token bar is an ApplicationV2 window. Monk's TokenBar saves its position in
 *   a user flag and passes it to the very first render, but the bar is re-rendered
 *   ~100 ms later (and on every token change) with a different size, and the width
 *   and height measured on that first render are kept as fixed values. Foundry keeps
 *   a window inside the screen using those stale sizes, so the bar can end up in the
 *   middle of the screen and refuse to be dragged until minimizing and restoring it
 *   makes Foundry measure it again. Collapsing the bar has the same problem.
 *
 * Fix:
 *   After each render of the token bar (and after restoring it from minimized, or
 *   collapsing/expanding it) let Foundry size it to its content ("auto") and move it
 *   to the saved position. Every move is saved in a client setting (per browser, so
 *   different screens can have different positions); Monk's own user flag is used as
 *   a fallback. Optionally the position can be locked. Monk's "Reset Position" menu
 *   also clears the saved position.
 */

import { MODULE_ID } from "../main.js";

export const key = "MonksTokenbarPosition";
export const module = "monks-tokenbar";

const LOCK = "MonksTokenbarPositionLock";
const DATA = "MonksTokenbarPositionData";

/** Extra settings shown under this patch (registered by main.js). */
export const settings = [
  { key: LOCK, type: Boolean, default: false },
  { key: DATA, type: Object, default: {}, config: false }
];

const APP_ID = "tokenbar";

const isPos = p => Number.isFinite(p?.left) && Number.isFinite(p?.top);

function savedPosition() {
  const own = game.settings.get(MODULE_ID, DATA);
  if (isPos(own)) return { left: own.left, top: own.top };
  const flag = game.user.getFlag("monks-tokenbar", "position");
  if (isPos(flag)) return { left: flag.left, top: flag.top };
  return null;
}

let storeTimer = null;
function storePosition(pos, delay = 500) {
  clearTimeout(storeTimer);
  storeTimer = setTimeout(() => game.settings.set(MODULE_ID, DATA, pos ?? {}), delay);
}

function isTokenBar(app) {
  return app?.id === APP_ID && app.constructor?.name === "TokenBar";
}

/** Size the bar to its content and put it where it was saved. */
function place(app) {
  const state = app?._dxpPosition;
  if (!state || !app.rendered || app.minimized) return;
  state.restoring = true;
  try {
    app.setPosition({ width: "auto", height: "auto", ...(state.pos ?? {}) });
  } catch (err) {
    console.error(`${MODULE_ID} | ${key}`, err);
  } finally {
    state.restoring = false;
  }
  state.ready = true;
}

function patchInstance(app) {
  if (app._dxpPosition) return;
  const state = app._dxpPosition = { pos: savedPosition(), restoring: false, ready: false };

  const setPosition = app.setPosition;
  app.setPosition = function (position = {}) {
    const moving = position && ("left" in position || "top" in position);
    if (moving && !state.restoring && state.pos && game.settings.get(MODULE_ID, LOCK)) {
      position = { ...position, left: state.pos.left, top: state.pos.top };
    }
    const result = setPosition.call(this, position);
    // Remember moves once our saved position has been applied (not Foundry's initial centering).
    if (moving && state.ready && !state.restoring && !this.minimized && isPos(result)) {
      state.pos = { left: result.left, top: result.top };
      storePosition(state.pos);
    }
    return result;
  };

  const maximize = app.maximize;
  app.maximize = async function (...args) {
    const result = await maximize.apply(this, args);
    place(this);
    return result;
  };

  // Monk's collapse button only toggles a CSS class; re-measure the bar afterwards.
  app.element?.addEventListener("click", event => {
    if (event.target.closest?.('[data-action="collapse"]')) setTimeout(() => place(app), 0);
  });
}

function onRender(app) {
  if (!isTokenBar(app)) return;
  patchInstance(app);
  // Wait for Foundry to finish its own positioning of this render.
  setTimeout(() => place(app), 0);
}

function onResetPosition() {
  storePosition(null, 0);
  const app = foundry.applications.instances.get(APP_ID);
  const state = app?._dxpPosition;
  if (!state) return;
  state.pos = null;
  state.restoring = true;
  try {
    app.setPosition({ width: "auto", height: "auto", left: undefined, top: undefined });   // Foundry centers it
  } finally {
    state.restoring = false;
  }
}

export function apply() {
  Hooks.on("renderTokenBar", onRender);
  Hooks.on("renderResetPosition", onResetPosition);

  // Monk's TokenBar may have rendered the bar before this patch was applied.
  const app = foundry.applications.instances.get(APP_ID);
  if (isTokenBar(app) && app.rendered) onRender(app);
}
