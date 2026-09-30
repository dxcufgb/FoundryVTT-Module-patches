/**
 * Patch: Monk's TokenBar - let a faded token bar reach the screen edges.
 *
 * What goes wrong:
 *   With Monk's "Allow Fade" setting the token bar gets Foundry's `faded-ui` class,
 *   the same class the core interface (hotbar, players list, ...) uses to fade out
 *   when not hovered. Foundry's styling for that class is written for the docked
 *   interface, not for a free-floating window, and changes more than the opacity,
 *   so the bar can no longer be dragged all the way to the edge of the screen.
 *
 * Fix:
 *   The first time the bar is rendered, compare its layout styles with and without
 *   `faded-ui` and set every layout value the class changes back to the unfaded
 *   one. The fade itself (opacity) is kept. Transitions are limited to opacity, so
 *   the bar follows the mouse while dragging. What was changed is logged to the
 *   console.
 */

import { MODULE_ID } from "../main.js";

export const key = "MonksTokenbarFade";
export const module = "monks-tokenbar";

const APP_ID = "tokenbar";
const FADE_CLASS = "faded-ui";

// Styles that affect where the window is drawn or how big Foundry measures it.
const SIDES = ["top", "right", "bottom", "left"];
const LAYOUT_PROPS = [
  ...SIDES.map(s => `margin-${s}`),
  ...SIDES.map(s => `padding-${s}`),
  ...SIDES.map(s => `border-${s}-width`),
  "position", "box-sizing", "transform", "translate", "scale", "rotate", "zoom",
  "min-width", "max-width", "min-height", "max-height"
];
const MOVING_TRANSITION = /\b(all|left|top|right|bottom|inset|transform|translate|margin[\w-]*|width|height)\b/;

function isTokenBar(app) {
  return app?.id === APP_ID && app.constructor?.name === "TokenBar";
}

function readStyles(elements) {
  return elements.map(el => {
    const cs = getComputedStyle(el);
    return Object.fromEntries(LAYOUT_PROPS.map(p => [p, cs.getPropertyValue(p)]));
  });
}

function fixFadedLayout(app) {
  const root = app.element;
  if (!root || root._dxpFadeFixed || !root.classList.contains(FADE_CLASS)) return;
  root._dxpFadeFixed = true;

  const elements = [root, root.querySelector(":scope > .window-header"), root.querySelector(":scope > .window-content")]
    .filter(Boolean);
  // Transitions that actually animate (a duration above 0s) something besides opacity.
  const transitions = elements.map(el => {
    const cs = getComputedStyle(el);
    const animates = cs.transitionDuration.split(",").some(d => parseFloat(d) > 0);
    return animates ? cs.transitionProperty : "";
  });

  // Compare with and without the class, without transitions so the values are final.
  const inline = elements.map(el => el.style.transition);
  elements.forEach(el => { el.style.transition = "none"; });
  const faded = readStyles(elements);
  root.classList.remove(FADE_CLASS);
  const plain = readStyles(elements);
  root.classList.add(FADE_CLASS);
  getComputedStyle(root).opacity;   // apply the faded styles before transitions return, so nothing animates
  elements.forEach((el, i) => { el.style.transition = inline[i]; });

  const changed = [];
  elements.forEach((el, i) => {
    const name = i === 0 ? "#tokenbar" : el.classList[0];
    for (const prop of LAYOUT_PROPS) {
      if (faded[i][prop] === plain[i][prop]) continue;
      el.style.setProperty(prop, plain[i][prop]);
      changed.push(`${name} ${prop}: ${faded[i][prop]} -> ${plain[i][prop]}`);
    }
    if (MOVING_TRANSITION.test(transitions[i])) {
      el.style.setProperty("transition-property", "opacity");
      changed.push(`${name} transition-property: ${transitions[i]} -> opacity`);
    }
  });

  if (changed.length) console.log(`${MODULE_ID} | ${key}: undid faded-ui layout changes`, changed);
  else console.log(`${MODULE_ID} | ${key}: faded-ui did not change the token bar's layout`);

  // Let Foundry measure the bar again with the corrected styles.
  app.setPosition({});
}

function onRender(app) {
  if (!isTokenBar(app)) return;
  try {
    fixFadedLayout(app);
  } catch (err) {
    console.error(`${MODULE_ID} | ${key}`, err);
  }
}

export function apply() {
  Hooks.on("renderTokenBar", onRender);

  // Monk's TokenBar may have rendered the bar before this patch was applied.
  const app = foundry.applications.instances.get(APP_ID);
  if (isTokenBar(app) && app.rendered) onRender(app);
}
