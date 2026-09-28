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

## Settings

Every patch can be turned on or off under **Configure Settings → Dxcufgb's patches** (per user; needs a reload). A patch for another module only runs when that module is active.

## License

[MIT](LICENSE)
