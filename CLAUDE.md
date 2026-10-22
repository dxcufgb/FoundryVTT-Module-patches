# Dxcufgb's patches

Foundry VTT v13 module (`dxcufgbs-patches`) holding small fixes for other modules (PopOut!, Monk's TokenBar). Plain ES modules, no build step, no dependencies, no tests. The folder lives inside Foundry's `Data/modules`, so changes show up after a Foundry reload.

## Layout
- `scripts/main.js`: registers one on/off setting per patch (plus any `settings` the patch declares) on `init`, then calls `apply()` on `ready` for enabled patches whose target module is active.
- `scripts/patches/*.js`: one file per patch. Each exports `key`, `module` (id of the patched module, or `null`), `apply()`, and optionally `settings: [{ key, type, default, config }]`.
- `lang/en.json`: `DXP.Settings.<key>.Name` / `.Hint` for every patch key and extra setting.
- `module.json`: `relationships.recommends` lists the patched modules. The version is overwritten from the release tag.
- `.github/workflows/ci.yml` / `release.yml`: thin callers of `dxcufgb/foundry-module-ci` (checks, packaging, release: Actions → Release module → Run workflow with the version); identical in every module.

## Adding a patch
1. Create `scripts/patches/<name>.js` with the exports above.
2. Import it and add it to `PATCHES` in `scripts/main.js`.
3. Add its `Name`/`Hint` strings to `lang/en.json` (also for each extra setting).
4. Add the patched module to `recommends` in `module.json` if it isn't there.
5. Add a row to the Features table in `README.md`.

## Conventions
- A patch must never break Foundry if the target module changes: guard lookups of the other module's classes/methods and fail soft (`main.js` already catches errors from `apply()`).
- Default settings are `scope: "client"`, on by default.
- Match the existing patch files for comment style and naming.

## Checks
A PostToolUse hook (`.claude/hooks/check-syntax.mjs`) syntax-checks edited `.js` (as ES modules) and `.json` files. Behaviour can only be verified in a running Foundry v13 instance.

## Git
Work on a descriptively named feature branch and open a PR to `main` (history uses PRs, e.g. "Monk's TokenBar: stop the bar jumping when tokens update (#6)").

## Review focus
- **Fail soft, also after `ready`**: `main.js` only catches errors thrown by `apply()`. Code that runs later (wrapped methods, render hooks, `keydown`/`pointerup` listeners, timers) must guard its own lookups of the other module and catch its own errors, as `PopoutRollDialogs`' wrapper and `MonksTokenbarFade`'s `onRender` do. A missing class or method should throw in `apply()` (then the patch is skipped with a console error), never later inside Foundry's code.
- **Wrappers**: a wrapped method calls the original with the same `this` and arguments and returns its value (`original.call(this, ...)`). The only exceptions are deliberate short-circuits that say why (`PopoutCopy` skips keybinding processing, `PopoutRollDialogs` returns `false`). Wrapping must be idempotent (`__dxpPopoutCopy`, `__dxpRollDialogs`, `_dxpPosition`, `_dxpFadeFixed`), and patches work by direct reassignment (no libWrapper), so check for conflicts with other modules that wrap the same method.
- **Target detection**: patches recognise the other module by names (`PopoutModule` global, `app.constructor.name === "TokenBar"`, app id `tokenbar`, `ROLL_CLASSES`/`USAGE_CLASSES`, the hooks `renderTokenBar`/`renderResetPosition`, Monk's `position` user flag). A change must keep those checks narrow, so a patch never touches other windows.
- **No un-apply**: `apply()` runs once on `ready` and nothing is undone, which is why each patch toggle has `requiresReload: true`. Extra settings are read live, at the moment they are used (`game.settings.get` inside the handler). A new extra setting that changes what `apply()` installs needs `requiresReload` too.
- **Permissions**: everything is per-client (`scope: "client"`). `RulerMove` moves only tokens with `isOwner`, through `TokenDocument#move` (walls, movement cost and Foundry's own checks), and respects `game.paused` for players. Never replace that with a direct `update` of `x`/`y`.
- **Hot paths**: the `keydown` listener (capture phase) and the `_processKeyboardContext` wrapper run on every key press, and the token bar hooks run on every token change. Return early and cheaply; layout measurement (`naturalSize`, `readStyles`) stays limited to the token bar element.
- **Import cycle**: the patch files import `MODULE_ID` from `main.js`, which imports them. Use `MODULE_ID` only inside functions, never at the top level of a patch file (it is not yet initialised while the patches load).
- **CI** (via `dxcufgb/foundry-module-ci`, `node scripts/check-module.mjs`): the exported `MODULE_ID` must equal `id` in `module.json`, and every visible setting needs `DXP.Settings.<key>.Name`/`.Hint` in `lang/en.json`. `.github/workflows/ci.yml` and `release.yml` are thin callers of `dxcufgb/foundry-module-ci`, identical in every module: do not edit them here (only Dependabot's bump of the pinned SHA), make the change in foundry-module-ci.
- A new patch needs every step of "Adding a patch" above: the `PATCHES` entry, the `lang/en.json` strings, the `recommends` entry and the README row.
