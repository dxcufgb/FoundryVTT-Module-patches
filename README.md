# Dxcufgb's patches

[![Foundry v13](https://img.shields.io/github/v/release/dxcufgb/FoundryVTT-Module-patches?label=Foundry%20v13&logo=foundryvirtualtabletop&color=ff6400)](https://github.com/dxcufgb/FoundryVTT-Module-patches/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/dxcufgb/FoundryVTT-Module-patches/module.zip?label=downloads&color=blue)](https://github.com/dxcufgb/FoundryVTT-Module-patches/releases)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-support-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/dxcufgb)\
[![CI](https://img.shields.io/github/actions/workflow/status/dxcufgb/FoundryVTT-Module-patches/ci.yml?branch=main&label=CI)](https://github.com/dxcufgb/FoundryVTT-Module-patches/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/dxcufgb/FoundryVTT-Module-patches)](LICENSE)

<a href="https://dxcufgb.github.io/FVTT-dev-showcase/"><img src="https://dxcufgb.github.io/FVTT-dev-showcase/assets/img/workshop-badge.png" alt="Dxcufgb's Workshop: every Foundry VTT project, video and changelog in one place" width="650"></a>

Small fixes for other modules. Each patch can be turned on or off in the module settings.

**Foundry VTT:** v13

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this link into **Manifest URL** at the bottom, and click **Install**:

```
https://github.com/dxcufgb/FoundryVTT-Module-patches/releases/latest/download/module.json
```

## Features

Small fixes for other modules. Each patch has its own on/off setting.

| Patch | What it fixes |
| --- | --- |
| **PopOut!: copy text** | In journals (and other windows) opened with [PopOut!](https://foundryvtt.com/packages/popout), Ctrl+C / Ctrl+X didn't copy selected text. PopOut! forwards key presses to Foundry, whose "copy tokens" shortcut only checks for selected text in the *main* window and so swallowed the key. The patch lets the browser copy the text when you have text selected in a popped-out window. |
| **PopOut!: roll dialogs in the window you clicked** | PopOut! moves "child" dialogs of a popped-out sheet next to it, so roll dialogs (attack, damage, check, save, skill/tool, manual dice entry) ended up in the sheet's separate window even when the roll was started from the main window. The patch opens roll dialogs in the window that was clicked last: the main Foundry window (brought to the front) or the popped-out window. Options: also do this for item/spell usage dialogs (on by default), and whether to switch to the main window (on by default). |
| **PopOut!: context menus in the window you right-clicked** | Right-clicking something on a sheet popped out with PopOut! (for example an item, spell or effect on a dnd5e character sheet) opened the menu in the main Foundry window instead of next to the sheet. Foundry puts these "fixed" menus in the main window's page. The patch moves the menu into the popped-out window you right-clicked, keeps it inside that window, and closes it when you click elsewhere there. |
| **Monk's TokenBar: remember position** | The [Monk's TokenBar](https://foundryvtt.com/packages/monks-tokenbar) window kept opening in the middle of the screen and could get stuck there until you minimized and restored it. Foundry kept the size measured on the bar's first render (before its tokens were shown) and used it to keep the window on screen. The patch sizes the bar to its content after every render, collapse and restore, and puts it back where you left it (saved per browser; Monk's own saved position is used if there is none yet). Option: lock the position (off by default). Monk's **Reset Position** menu also clears the saved position. |
| **Monk's TokenBar: fade and screen edges** | With Monk's **Allow Fade** setting on, the token bar gets Foundry's fade styling (made for the docked interface), and could no longer be dragged to the edge of the screen. The patch keeps the fade but undoes the layout changes that styling makes to the bar, and lists them in the browser console. |
| **Move a token with the ruler** | Foundry v13 dropped the old shortcut where pressing Space while measuring with the ruler moved your token along the measured path. The patch brings it back: start the measurement on a token you control (or your assigned character's token), add waypoints as usual, and press Space (hold Shift as well to skip snapping to the grid, as with the ruler). The move goes through Foundry's normal token movement, so walls and movement cost still apply, and players can't move while the game is paused. |

## Settings

Every patch can be turned on or off under **Configure Settings → Dxcufgb's patches**. All settings are saved per browser (like Foundry's other client settings), not per user or world, so set them on each computer you play on. Turning a patch on or off needs a reload; the options under a patch take effect straight away. A patch for another module only runs when that module is active.

| Setting | Default | What it does |
| --- | --- | --- |
| **PopOut!: allow copying text in popped-out windows** | on | Turns the **PopOut!: copy text** patch on or off. |
| **PopOut!: show roll dialogs in the window you clicked** | on | Turns the **PopOut!: roll dialogs in the window you clicked** patch on or off. |
| **PopOut!: also item and spell usage dialogs** | on | Option: also open the dialogs for using an item or casting a spell (e.g. choosing a spell slot) in the window you clicked. |
| **PopOut!: bring the main window to the front** | on | Option: when such a dialog opens in the main Foundry window, switch to it. |
| **PopOut!: show context menus in the window you right-clicked** | on | Turns the **PopOut!: context menus in the window you right-clicked** patch on or off. |
| **Monk's TokenBar: remember the token bar position** | on | Turns the **Monk's TokenBar: remember position** patch on or off. |
| **Monk's TokenBar: lock the token bar position** | off | Option: stops the token bar from being dragged away from its saved position. Turn off to move it, then turn back on. |
| **Monk's TokenBar: let a faded token bar reach the screen edges** | on | Turns the **Monk's TokenBar: fade and screen edges** patch on or off. Does nothing when Monk's **Allow Fade** is off. |
| **Move a token with the ruler (Space)** | on | Turns the **Move a token with the ruler** patch on or off. |

## For module authors

This module has no API and calls no hooks of its own. The patches replace these methods directly (no libWrapper) and hand everything they don't fix on to the original, so another module that replaces the same method can conflict with them:

| Patch | Changes |
| --- | --- |
| **PopOut!: copy text** | `game.keyboard._processKeyboardContext` (skips keybindings only for Ctrl/Cmd+C, Ctrl/Cmd+X and Ctrl/Cmd+Insert with text selected in a popped-out window) |
| **PopOut!: roll dialogs in the window you clicked** | `PopoutModule.prototype.handleChildDialog` (returns `false` for roll and usage dialogs when the main window was clicked last) |
| **PopOut!: context menus in the window you right-clicked** | `foundry.applications.ux.ContextMenu.prototype._setFixedPosition` |
| **Monk's TokenBar: remember position** | `setPosition` and `maximize` on the token bar window (`#tokenbar`) only; listens to `renderTokenBar` and `renderResetPosition` |
| **Monk's TokenBar: fade and screen edges** | Inline layout styles on the token bar window; listens to `renderTokenBar` |
| **Move a token with the ruler** | A `keydown` listener (capture phase) that handles Space while the ruler is measuring from one of your tokens |

## License

[MIT](LICENSE)

## Releasing

For the maintainer: **Actions → Release module → Run workflow**, type the version (for example `1.2.3`) and run it. The module is checked and packaged first; only then is the release `v1.2.3` published with `module.json` and `module.zip`. CI and releases come from [dxcufgb/foundry-module-ci](https://github.com/dxcufgb/foundry-module-ci), the same for every module.
