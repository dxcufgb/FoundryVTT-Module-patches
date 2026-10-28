/**
 * Patch: PopOut! - open context menus in the window that was right-clicked.
 *
 * Why they end up in the main window:
 *   Foundry's ContextMenu has two ways to place a menu. A normal menu is put
 *   inside the clicked element, so it stays in whatever window that element is
 *   in. A "fixed" menu (used by dnd5e sheets for items, effects, activities, and
 *   by any ContextMenu created with `fixed: true`) goes through
 *   ContextMenu#_setFixedPosition, which appends it to the global `document.body`
 *   and keeps it inside the global viewport. `document` is always the MAIN
 *   window, so right-clicking an item on a sheet popped out with PopOut! shows
 *   the menu in the main Foundry window instead of next to the sheet.
 *
 * Fix:
 *   Wrap ContextMenu#_setFixedPosition. Let Foundry place the menu as usual,
 *   then, if the clicked element is in a PopOut! window, move the menu into that
 *   window's body and keep it inside that window. The menu's own listeners move
 *   with it. Foundry closes open menus on clicks in the main document only, so
 *   we also close it on a click elsewhere in the popped-out window.
 */

import { MODULE_ID } from "../main.js";

export const key = "PopoutContextMenus";
export const module = "popout";

// The PopOut! window (a popped-out sheet) that `doc` belongs to, or null.
function popoutWindowOf(doc) {
  if (!doc || doc === document) return null;
  const win = doc.defaultView;
  if (!win || win.closed) return null;
  const PM = typeof PopoutModule !== "undefined" ? PopoutModule : null;   // eslint-disable-line no-undef
  for (const state of PM?.singleton?.poppedOut?.values?.() ?? []) {
    if (state?.window === win) return win;
  }
  return null;
}

// Shift the menu back inside the window if it sticks out on the right or bottom.
function keepInside(menu, doc) {
  const { clientWidth, clientHeight } = doc.documentElement;
  const rect = menu.getBoundingClientRect();
  if (rect.right > clientWidth) menu.style.left = `${Math.max(0, clientWidth - rect.width)}px`;
  if (rect.bottom > clientHeight) menu.style.top = `${Math.max(0, clientHeight - rect.height)}px`;
}

// Close the menu on the next pointerdown outside it in the popped-out window.
function closeOnOutsideClick(contextMenu, menu, doc) {
  const onPointerDown = event => {
    try {
      // Already closed, or replaced by another menu: nothing left to do.
      if (!menu.isConnected || ("element" in contextMenu && contextMenu.element !== menu)) {
        doc.removeEventListener("pointerdown", onPointerDown, true);
        return;
      }
      if (menu.contains(event.target)) return;
      doc.removeEventListener("pointerdown", onPointerDown, true);
      contextMenu.close?.();
    } catch (err) {
      console.error(`${MODULE_ID} | PopoutContextMenus`, err);
    }
  };
  doc.addEventListener("pointerdown", onPointerDown, true);
}

function moveToPopout(contextMenu, menu, target) {
  const doc = target?.ownerDocument;
  if (!(menu instanceof HTMLElement) || !popoutWindowOf(doc)) return;
  if (menu.ownerDocument === doc && menu.isConnected) return;
  doc.body.append(doc.adoptNode(menu));
  keepInside(menu, doc);
  closeOnOutsideClick(contextMenu, menu, doc);
}

export function apply() {
  const CM = foundry?.applications?.ux?.ContextMenu;
  if (!CM?.prototype?._setFixedPosition) throw new Error("ContextMenu#_setFixedPosition not found");

  const original = CM.prototype._setFixedPosition;
  if (original.__dxpContextMenus) return;

  const patched = function (menu, target, ...args) {
    const result = original.call(this, menu, target, ...args);
    const move = () => {
      try {
        moveToPopout(this, menu, target);
      } catch (err) {
        console.error(`${MODULE_ID} | PopoutContextMenus`, err);
      }
    };
    move();
    // In case a subclass positions the menu asynchronously.
    if (typeof result?.then === "function") result.then(move, () => {});
    return result;
  };
  patched.__dxpContextMenus = true;
  CM.prototype._setFixedPosition = patched;
}
