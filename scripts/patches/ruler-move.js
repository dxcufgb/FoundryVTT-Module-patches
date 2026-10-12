/**
 * Patch: Foundry core - press Space while measuring to move your token.
 *
 * Why it's gone:
 *   Up to v12, pressing Space while the ruler measured from one of your tokens
 *   moved that token along the measured path. v13 rewrote the ruler and dropped
 *   that keybinding; tokens now show their own ruler while dragged.
 *
 * Fix:
 *   Listen for Space (capture phase, before Foundry's keybindings) while your
 *   ruler is active. If it starts on a token you control (or your assigned
 *   character's token), move that token through the ruler's waypoints with
 *   TokenDocument#move, which applies walls and movement cost like a drag does,
 *   then end the measurement. Otherwise Space keeps its normal behaviour.
 */

export const key = "RulerMove";
export const module = null;

/** The token whose bounds contain the ruler's origin, like v12's Ruler#_getMovementToken. */
function getMovementToken(origin) {
  let tokens = canvas.tokens?.controlled ?? [];
  if (!tokens.length && game.user.character) tokens = game.user.character.getActiveTokens();
  return tokens.find(t => t.isOwner && new PIXI.Rectangle(t.x - 1, t.y - 1, t.w + 2, t.h + 2).contains(origin.x, origin.y));
}

function onKeyDown(event) {
  if (event.code !== "Space" || event.repeat || event.altKey || event.metaKey) return;
  if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
  const ruler = canvas.ready ? canvas.controls?.ruler : null;
  if (!ruler?.active || ruler.path.length < 2) return;
  const token = getMovementToken(ruler.origin);
  if (!token) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (game.paused && !game.user.isGM) {
    ui.notifications.warn("GAME.PausedWarning", { localize: true });
    return;
  }

  // Ruler points are where the pointer was; keep the token's offset from the origin (its top-left corner),
  // then snap, since the ruler also snaps to vertices and edges (Shift skips snapping, as for the ruler).
  const dx = token.document.x - ruler.origin.x;
  const dy = token.document.y - ruler.origin.y;
  const waypoints = ruler.path.slice(1).map(({ x, y }) => {
    const point = { x: x + dx, y: y + dy };
    return event.shiftKey ? point : token.getSnappedPosition(point);
  });
  token.document.move(waypoints, { method: "dragging", constrainOptions: token._getDragConstrainOptions?.() })
    .catch(err => console.error("dxcufgbs-patches | RulerMove: move failed", err));

  // End the measurement the way a plain left click does.
  const mim = canvas.mouseInteractionManager;
  if (mim?.interactionData) mim.interactionData.cancelled = true;
  if (mim?.cancel) mim.cancel();
  else ruler.reset();
}

export function apply() {
  if (typeof foundry.documents?.TokenDocument?.prototype?.move !== "function") {
    throw new Error("TokenDocument#move not found");
  }
  window.addEventListener("keydown", onKeyDown, { capture: true });
}
