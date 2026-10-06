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
 *   collapsing/expanding it) measure the size its content needs and, if the bar's
 *   size or position is off, give Foundry that size and the saved position. When the
 *   bar is dragged by its header the new position is saved in a client setting (per
 *   browser, so different screens can have different positions); Monk's own user flag
 *   is used as a fallback. Optionally the position can be locked. Monk's "Reset Position" menu
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

/**
 * The size the bar's content needs: its fixed width/height removed and the width set
 * to "max-content", so the tokens neither wrap nor get cut off by the screen edge.
 * The bar is not moved, and transitions are off while measuring so nothing animates.
 */
function naturalSize(el) {
  const { width, height, transition } = el.style;
  Object.assign(el.style, { transition: "none", width: "max-content", height: "" });
  const size = { width: el.offsetWidth, height: el.offsetHeight };
  Object.assign(el.style, { width, height });
  void el.offsetWidth;                // apply the old size before transitions come back
  el.style.transition = transition;
  return size.width > 0 && size.height > 0 ? size : {};
}

const differs = (a, b) => Number.isFinite(a) && !(Math.abs(a - (b ?? NaN)) < 1);

/** Size the bar to its content and put it where it was saved, changing only what is off. */
function place(app) {
  const state = app?._dxpPosition;
  if (!state || state.dragging || !app.rendered || app.minimized || !app.element) return;
  const current = app.position ?? {};
  const wanted = {};
  const size = naturalSize(app.element);
  if (differs(size.width, current.width)) wanted.width = size.width;
  if (differs(size.height, current.height)) wanted.height = size.height;
  if (state.pos && (differs(state.pos.left, current.left) || differs(state.pos.top, current.top))) {
    Object.assign(wanted, state.pos);
  }
  if (Object.keys(wanted).length) {
    state.restoring = true;
    try {
      app.setPosition(wanted);
    } catch (err) {
      console.error(`${MODULE_ID} | ${key}`, err);
    } finally {
      state.restoring = false;
    }
  }
  state.ready = true;
}

/** Save where the bar is now (after the user dragged it), or snap back when locked. */
function recordPosition(app) {
  const state = app._dxpPosition;
  const { left, top } = app.position ?? {};
  if (!isPos({ left, top }) || app.minimized) return;
  if (state.pos && game.settings.get(MODULE_ID, LOCK)) return place(app);
  state.pos = { left, top };
  storePosition(state.pos);
}

function patchInstance(app) {
  if (app._dxpPosition) return;
  const state = app._dxpPosition = { pos: savedPosition(), restoring: false, ready: false, dragging: false };

  const setPosition = app.setPosition;
  app.setPosition = function (position = {}) {
    const moving = position && ("left" in position || "top" in position);
    if (moving && !state.restoring && state.pos && game.settings.get(MODULE_ID, LOCK)) {
      position = { ...position, left: state.pos.left, top: state.pos.top };
    }
    return setPosition.call(this, position);
  };

  // Foundry clamps the bar to the screen with whatever size it measures at that moment and
  // keeps the clamped left/top. A single too-wide measurement (e.g. while the token list is
  // being replaced) therefore pins the bar to the left edge until the next fix-up. Always
  // resolve left/top from the saved position instead, so it can't be lost or pulled in.
  const updatePosition = app._updatePosition;
  app._updatePosition = function (position) {
    const result = updatePosition.call(this, position);
    if (state.pos && !state.dragging && Number.isFinite(result.width)) {
      const maxLeft = Math.max(document.documentElement.clientWidth - result.width * (result.scale ?? 1), 0);
      result.left = Math.clamp(state.pos.left, 0, maxLeft);
      result.top = Math.clamp(state.pos.top, 0, Math.max(document.documentElement.clientHeight - (Number.isFinite(result.height) ? result.height : 0), 0));
    }
    return result;
  };

  const maximize = app.maximize;
  app.maximize = async function (...args) {
    const result = await maximize.apply(this, args);
    place(this);
    return result;
  };

  // Track dragging by the header directly, so the saved position always matches the
  // bar and re-renders (e.g. when a token moves) never pull it back mid-drag.
  app.element?.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.target.closest?.(".window-header")) return;
    if (event.target.closest("button, a, input, [data-action]")) return;
    state.dragging = true;
  });
  window.addEventListener("pointerup", () => {
    if (!state.dragging) return;
    state.dragging = false;
    setTimeout(() => recordPosition(app), 0);
  });

  // Monk's collapse button only toggles a CSS class; re-measure the bar afterwards.
  app.element?.addEventListener("click", event => {
    if (event.target.closest?.('[data-action="collapse"]')) setTimeout(() => place(app), 0);
  });
}

function onRender(app) {
  if (!isTokenBar(app)) return;
  patchInstance(app);
  // Fix it before the browser paints, then again once Foundry has finished its own
  // positioning of this render.
  place(app);
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
    app.setPosition({ ...naturalSize(app.element), left: undefined, top: undefined });   // Foundry centers it
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
