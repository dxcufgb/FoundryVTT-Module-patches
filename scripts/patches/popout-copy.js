/**
 * Patch: PopOut! - copy text with Ctrl+C in popped-out windows.
 *
 * Why it breaks:
 *   PopOut! forwards every keydown/keyup from a popped-out window to
 *   game.keyboard._processKeyboardContext() so keybindings work there.
 *   Foundry's core "copy" (Ctrl+C) and "cut" (Ctrl+X) keybindings first check
 *   `window.getSelection()` to see if the user has text selected, but `window`
 *   is the MAIN window, where nothing is selected. So core treats the key as
 *   "copy tokens/placeables", reports it as handled, and _processKeyboardContext
 *   calls event.preventDefault() on the popout's key event, which cancels the
 *   browser's native text copy.
 *
 * Fix:
 *   Wrap game.keyboard._processKeyboardContext. When a Ctrl/Cmd+C, Ctrl/Cmd+X
 *   or Ctrl/Cmd+Insert comes from a window other than the main one and that
 *   window has a text selection, skip keybinding processing for that event (only
 *   key tracking is kept) so the browser copies the text normally.
 */

export const key = "PopoutCopy";
export const module = "popout";

const COPY_CODES = new Set(["KeyC", "KeyX", "Insert"]);

function isTextCopyInOtherWindow(context) {
  const event = context?.event;
  if (!event || context.up) return false;
  if (!(event.ctrlKey || event.metaKey)) return false;
  if (!COPY_CODES.has(event.code ?? context.key)) return false;

  const win = event.view ?? event.target?.ownerDocument?.defaultView;
  if (!win || win === window) return false;

  try {
    return (win.getSelection()?.toString() ?? "") !== "";
  } catch {
    return false;
  }
}

export function apply() {
  const keyboard = game.keyboard;
  const original = keyboard._processKeyboardContext;
  if (typeof original !== "function") throw new Error("game.keyboard._processKeyboardContext not found");
  if (original.__dxpPopoutCopy) return;

  const patched = function (context, options) {
    if (isTextCopyInOtherWindow(context)) {
      // Keep key tracking consistent, but don't run keybindings or cancel the event.
      this.downKeys?.add(context.key);
      return;
    }
    return original.call(this, context, options);
  };
  patched.__dxpPopoutCopy = true;
  keyboard._processKeyboardContext = patched;
}
