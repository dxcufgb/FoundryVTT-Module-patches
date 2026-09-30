# Dxcufgb's patches

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
| **PopOut!: roll dialogs in the main window** | Roll dialogs (attack, damage, check, save, skill/tool, manual dice entry) opened from a character sheet in a PopOut! window appeared in that separate window, because PopOut! moves "child" dialogs of a popped-out sheet next to it. The patch keeps roll dialogs in the main Foundry window and brings it to the front. Options: also keep item/spell usage dialogs there (on by default), and whether to switch to the main window (on by default). |
| **Monk's TokenBar: remember position** | The [Monk's TokenBar](https://foundryvtt.com/packages/monks-tokenbar) window kept opening in the middle of the screen and could get stuck there until you minimized and restored it. Foundry kept the size measured on the bar's first render (before its tokens were shown) and used it to keep the window on screen. The patch sizes the bar to its content after every render, collapse and restore, and puts it back where you left it (saved per browser; Monk's own saved position is used if there is none yet). Option: lock the position (off by default). Monk's **Reset Position** menu also clears the saved position. |

## Settings

Every patch can be turned on or off under **Configure Settings → Dxcufgb's patches** (per user; needs a reload). A patch for another module only runs when that module is active.

## License

[MIT](LICENSE)
