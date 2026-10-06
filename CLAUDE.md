# Dxcufgb's patches

Foundry VTT v13 module (`dxcufgbs-patches`) holding small fixes for other modules (PopOut!, Monk's TokenBar). Plain ES modules, no build step, no dependencies, no tests. The folder lives inside Foundry's `Data/modules`, so changes show up after a Foundry reload.

## Layout
- `scripts/main.js`: registers one on/off setting per patch (plus any `settings` the patch declares) on `init`, then calls `apply()` on `ready` for enabled patches whose target module is active.
- `scripts/patches/*.js`: one file per patch. Each exports `key`, `module` (id of the patched module, or `null`), `apply()`, and optionally `settings: [{ key, type, default, config }]`.
- `lang/en.json`: `DXP.Settings.<key>.Name` / `.Hint` for every patch key and extra setting.
- `module.json`: `relationships.recommends` lists the patched modules. The version is overwritten from the release tag.
- `.github/workflows/release.yml`: builds `module.zip` when a GitHub Release is published.

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
