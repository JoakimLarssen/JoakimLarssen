# SETUP

This package is your GitHub **profile README**. When the files live in a repo
named exactly `JoakimLarssen/JoakimLarssen` (same as your username), GitHub
renders `README.md` at the top of <https://github.com/JoakimLarssen>.

## 1. Files in this package

```
README.md                                  the profile index
SETUP.md                                    this file
assets/header-dark.svg                      wordmark + tagline, dark scheme
assets/header-light.svg                     wordmark + tagline, light scheme
assets/contributions-2mo.svg               seeded teal contribution grid (auto-refreshed)
.github/workflows/contributions.yml        Action: regenerate the contribution grid
scripts/render-contributions.mjs           Node, no deps, renders the grid SVG
```

## 2. Deploy to JoakimLarssen/JoakimLarssen

If the special repo does not exist yet, create it (it must match your username
exactly, and must be **public** for the profile README to show):

```bash
# from an empty working directory
gh repo create JoakimLarssen/JoakimLarssen --public --description "profile" --clone
```

Copy everything from this package into the repo root, preserving the
`assets/`, `scripts/`, and `.github/` directories. Then:

```bash
git add .
git commit -m "profile README: terminal aesthetic + contribution widget"
git branch -M main
git push -u origin main
```

The README references assets with **relative paths** (`./assets/...`), so the
images resolve from whatever the repo's default branch is. Keep the default
branch named `main` (the Action pushes to `main`).

## 3. Enable the Action

1. In the repo, go to **Settings -> Actions -> General**.
2. Under **Workflow permissions**, select **Read and write permissions** and
   save. (The workflow also declares `permissions: contents: write`, but the
   repo-level setting must allow writes for the bot commit + push to succeed.)
3. Go to the **Actions** tab. If prompted, enable workflows for this repo.
4. Run it once by hand to seed the first real data: open
   **contributions widget**, then **Run workflow** (the `workflow_dispatch`
   button) on the `main` branch.

After that it runs on schedule: `contributions widget` at 00:17 and 12:17 UTC,
plus on push to the script. It commits only when the output actually changed,
with `[skip ci]` so the bot commit does not trigger another run.

This is the only Action in the package. It runs on a **public** repo, so it
does not consume your monthly Actions minutes (that quota is private-repo only).

## 4. Private contributions caveat (important)

The contribution grid will only count your **private** activity if BOTH are true:

1. You have enabled it on your profile:
   **github.com -> Settings -> Public profile ->
   "Include private contributions on my profile"** (turn it on).
2. The token the Action uses can read those private counts.

The default `GITHUB_TOKEN` available to Actions **may not** return private
contribution counts through the GraphQL `contributionsCollection`. If your grid
looks emptier than your real activity, add a classic Personal Access Token:

1. Create a **classic** PAT at
   **Settings -> Developer settings -> Personal access tokens -> Tokens (classic)**
   with only the **`read:user`** scope.
2. In the repo, **Settings -> Secrets and variables -> Actions -> New
   repository secret**, name it **`GH_TOKEN`**, paste the PAT.
3. Re-run the `contributions widget` workflow.

The script prefers `GH_TOKEN` and falls back to `GITHUB_TOKEN`. If no token is
present at all, `render-contributions.mjs` writes a deterministic **seeded** grid
so the README never breaks. The committed `assets/contributions-2mo.svg` is
exactly such a seed; the first real Action run replaces it.

## 5. Local dry-run (optional)

Node 18+ (uses global `fetch`, no npm install needed):

```bash
# grid (with real data)
GH_TOKEN=ghp_xxx node scripts/render-contributions.mjs
# grid (seeded, no token)
node scripts/render-contributions.mjs
```

## 6. Remaining [PLACEHOLDER] items

Resolve these before or shortly after publishing:

1. **Bachelor thesis link** in `README.md`. To avoid shipping a dead link, the
   "Bachelor thesis" row currently renders as plain bold text (no anchor).
   Once the thesis URL exists (published PDF, repo, or landing page), wrap the
   label in a link. Change:

   ```html
   <td valign="top"><b>Bachelor thesis</b></td>
   ```

   to:

   ```html
   <td valign="top"><a href="THESIS_URL_HERE"><b>Bachelor thesis</b></a></td>
   ```

No other placeholders. The site link (`joakimlarssen.github.io`), GitHub,
email, and LinkedIn are all real and wired.

## 7. Design notes (why it looks the way it does)

- All visual styling comes from committed SVG assets, markdown structure, and
  restraint. GitHub strips `<style>`, `<script>`, inline `style=` attributes,
  and external CSS from READMEs, so none of those are used.
- Palette "Phosphor Field": bg `#0D1011`, elevated `#14181A`, text `#E6E7E8`,
  dim `#828B8F`, rule `#22282B`, accent teal `#5ED3C4` (the only accent),
  accent-dim `#3C8C84`, alert `#E5645E` (status only). Flat, never gradient.
- No badge services, no stats/streak/top-langs/trophy cards, no view counter,
  no typing or snake animations. The contribution grid is a self-hosted SVG
  generated by the included script, not a third-party widget.
- Fonts: SVGs request `ui-monospace, 'JetBrains Mono', ...` and degrade to the
  viewer's monospace stack, so they render even where JetBrains Mono is absent.
```
