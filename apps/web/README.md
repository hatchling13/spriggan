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

## Cloudflare Pages

Create a Pages project with Git integration and the following settings:

| Setting                | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| Project name           | `spriggan`                                            |
| Production branch      | `main`                                                |
| Framework preset       | None                                                  |
| Root directory         | Repository root                                       |
| Build command          | `pnpm install --frozen-lockfile && pnpm nx build web` |
| Build output directory | `apps/web/dist`                                       |

Set these build environment variables for both production and preview:

| Variable                  | Value     |
| ------------------------- | --------- |
| `NODE_VERSION`            | `24.22.3` |
| `PNPM_VERSION`            | `11.28.5` |
| `SKIP_DEPENDENCY_INSTALL` | `1`       |

The explicit install step uses the committed lockfile. The pnpm version matches
the root `packageManager` field. Cloudflare's build image supports these version
overrides and skipping automatic installation; see the
[build image documentation](https://developers.cloudflare.com/pages/configuration/build-image/).
The monorepo root allows Nx and pnpm to resolve the ordinare workspace dependency;
see [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

Cloudflare Pages serves the application through its default SPA fallback. Keep the
build output free of a top-level `404.html` so direct tool URLs resolve to
`index.html`; see [serving pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

The root `wrangler.jsonc` records the Pages project name, output directory, and
compatibility date using the
[Pages configuration format](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).
Keep its name aligned with the Pages project created in the dashboard.

Review a preview deployment from the feature branch before merging to `main`.
Check the home page, navigation to ordinare, direct loading and refreshing of
`/ordinare`, and the return link. Check JSON formatting, JSONC comments, indentation,
empty input, and syntax errors.
Connect the intended custom domain through the Pages project's Custom domains
settings after the site is deployed.
