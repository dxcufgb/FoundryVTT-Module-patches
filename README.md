# Dxcufgb's patches

Small fixes for other modules. Each patch can be turned on or off in the module settings.

**Foundry VTT:** v13

## Installation

In Foundry: **Add-on Modules → Install Module**, paste this link into **Manifest URL** at the bottom, and click **Install**:

```
https://github.com/Dxcufgb/dxcufgbs-patches/releases/latest/download/module.json
```

## Features

Small fixes for other modules. Each patch has its own on/off setting.

| Patch | What it fixes |
| --- | --- |
| **PopOut!: copy text** | In journals (and other windows) opened with [PopOut!](https://foundryvtt.com/packages/popout), Ctrl+C / Ctrl+X didn't copy selected text. PopOut! forwards key presses to Foundry, whose "copy tokens" shortcut only checks for selected text in the *main* window and so swallowed the key. The patch lets the browser copy the text when you have text selected in a popped-out window. |

## Settings

Every patch can be turned on or off under **Configure Settings → Dxcufgb's patches** (per user; needs a reload). A patch for another module only runs when that module is active.

## Releasing a new version (maintainer notes)

1. Commit and push your changes.
2. On GitHub, open **Releases → Draft a new release**, create a new tag such as `v1.0.1`, and click **Publish release**.
3. The **Release module** GitHub Action sets the version from the tag, fills in the download links, builds `module.zip`, and attaches `module.json` and `module.zip` to the release.

Foundry installs and updates from the latest release, so users get the new version the next time they check for updates.

## License

[MIT](LICENSE)
