# Spriggan web

Solid application for the Spriggan tool collection. The home page (`/`) lists
available tools and links to the ordinare JSON/JSONC formatter at `/ordinare`.
Navigation uses regular links. The current ordinare release
supports indentation and comment preservation. Blank-line preservation and
width-dependent layout remain follow-up work. Formatting runs in the browser.

## Local development

Run commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm nx serve web
```

Open `http://localhost:4200`. Stop the server with `Ctrl+C`.

## Release validation

```sh
pnpm nx run-many -p web @spriggan/ordinare -t lint test typecheck build
```

The production site is generated in `apps/web/dist`.

## Cloudflare deployment

Connect the repository to Workers Builds with the following settings:

| Setting           | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| Project name      | `spriggan`                                            |
| Production branch | `main`                                                |
| Root directory    | Repository root                                       |
| Build command     | `pnpm install --frozen-lockfile && pnpm nx build web` |
| Deploy command    | `npx wrangler deploy`                                 |

Set these build environment variables for both production and preview:

| Variable                  | Value     |
| ------------------------- | --------- |
| `NODE_VERSION`            | `24.22.3` |
| `PNPM_VERSION`            | `11.28.5` |
| `SKIP_DEPENDENCY_INSTALL` | `1`       |

The explicit install step uses the committed lockfile. The pnpm version matches
the root `packageManager` field. Cloudflare's build image supports these version
overrides and skipping automatic installation; see the
[build image documentation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).
The monorepo root allows Nx and pnpm to resolve the ordinare workspace dependency.

The root `wrangler.jsonc` explicitly sets `assets.directory` to `apps/web/dist`.
Wrangler deploys the existing build output as static assets. The
`assets.not_found_handling` setting enables SPA fallback, so navigation directly to
`/ordinare` serves `index.html`; see
[SPA configuration](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

Keep the Wrangler `name` aligned with the Worker created in the dashboard.
The explicit asset configuration identifies the deployable output within the
workspace, avoiding framework auto-configuration at the repository root.

Review a preview deployment from the feature branch before merging to `main`.
Check the home page, navigation to ordinare, direct loading and refreshing of
`/ordinare`, and the return link. Check JSON formatting, JSONC comments, indentation,
empty input, and syntax errors.
Connect the intended custom domain through the Worker's domain settings after the
site is deployed.
