# skiui

TUI and CLI based multi-agent skill manager.

## Installation

### With Mise

Install the latest released `skiui` binary via Mise:

```sh
mise use --global "github:lsymds/skiui@latest"
```

Or add it to your `mise.toml`:

```toml
[tools]
"github:lsymds/skiui" = "latest"
```

Verify:

```sh
skiui --help
```

### Manual (prebuilt binaries)

1. Open `https://github.com/lsymds/skiui/releases`.
2. Download the archive for your platform:
   - Linux x64: `skiui-vX.Y.Z-linux-x64.tar.gz`
   - Linux arm64: `skiui-vX.Y.Z-linux-arm64.tar.gz`
   - macOS x64: `skiui-vX.Y.Z-darwin-x64.tar.gz`
   - macOS arm64: `skiui-vX.Y.Z-darwin-arm64.tar.gz`
   - Windows x64: `skiui-vX.Y.Z-windows-x64.zip`
3. Extract the archive and move `skiui` (or `skiui.exe`) into a directory on your `PATH`.

Verify:

```sh
skiui --help
```

### Compilation (manual Bun install)

If you prefer to build from source without Mise:

1. Install Bun: `https://bun.sh/docs/installation`
2. Build from source:

```sh
git clone https://github.com/lsymds/skiui.git
cd skiui
bun install --frozen-lockfile
bun build src/apps/cli/index.ts --compile --outfile skiui
```

Run the compiled binary:

```sh
./skiui --help
```

## Usage

### CLI Reference

- `skiui init` initializes global and project config for the current repository.
- `skiui init` also creates `.skiui/AGENTS.md` in project scope as the default rules source file.
- `skiui init --scope <local|project|global>` selects which scope to initialize.
- `skiui repo add <repo> [--name <repo-name>] [--scope <local|project|global>]` adds a repository source (Git URL or filesystem path).
- `skiui agent enable <assistant-id> [--scope <local|project|global>]` enables an assistant in a specific config scope.
- `skiui agent disable <assistant-id> [--scope <local|project|global>]` disables an assistant in a specific config scope.
- `skiui skill enable <repo-name> <skill-name> [--scope <local|project|global>]` enables a skill in a configured repository.
- `skiui apply` syncs repositories, links enabled skills, links rules from `rulesPath` (default `.skiui/AGENTS.md`) into enabled assistants' rule files, and reconciles project `.gitignore` entries for skiui/assistant paths while excluding configured `rulesPath` and configured filesystem repository source paths.
- `skiui list` lists enabled skills by config scope.
- `skiui config` prints the effective merged config.

### Examples

#### Initialize configuration

Inside a repository, initialize project config (and register the project in global config):

```sh
skiui init
```

To create local override config too:

```sh
skiui init --scope local
```

#### Add skill repositories

Add a Git repository source:

```sh
skiui repo add https://github.com/vercel-labs/agent-skills
```

Add a filesystem source (relative or absolute path), with an explicit repository name:

```sh
skiui repo add .skiui/external-skills --name external
```

Notes:

- Repository names are inferred automatically when `--name` is omitted.
- `repo add` runs an initial sync after adding a new source.

#### Enable skills

Enable a skill from a configured repository:

```sh
skiui skill enable agent-skills my-skill
```

Enable into a specific scope when needed:

```sh
skiui skill enable external my-skill --scope local
```

### Enable agents

Enable assistants that should receive linked skills/rules:

```sh
skiui agent enable claude
skiui agent enable codex
```

You can disable an assistant the same way:

```sh
skiui agent disable codex
```

#### Apply changes and inspect state

Apply sync/linking after configuration updates:

```sh
skiui apply
```

Inspect enabled skills by scope:

```sh
skiui list
```

Inspect the merged effective config:

```sh
skiui config
```

## Configuration hierarchy

skiui reads and merges config in this order:

1. global: `~/.config/skiui/skiui.json` (or `$SKIUI_GLOBAL_CONFIG_DIR/skiui.json`)
2. project: `<repo>/.skiui/skiui.json`
3. local: `<repo>/.skiui/skiui.local.json`

Precedence is `local > project > global` for overlapping values.

- Without `--scope`, writes default to `project` when project config exists, otherwise `global`.
- `local` scope requires project config.
- `skiui config` shows the final merged result that `skiui apply` uses.

### When each scope is useful

- **Global** (`~/.config/skiui/skiui.json`): machine-wide defaults you want in every repo on your machine (for example, a default assistant enablement policy or shared repository source).
- **Project** (`.skiui/skiui.json`): team/shared defaults for one repository; use this for repo-level conventions everyone should inherit.
- **Local** (`.skiui/skiui.local.json`): personal overrides for one repository without changing the project baseline.

Typical pattern:

1. Put organization or machine defaults in **global**.
2. Put repository standards in **project**.
3. Put developer-specific tweaks in **local**.

### How overrides behave

- `cachePath` and `rulesPath`: nearest scope wins (`local`, then `project`, then `global`).
- `assistants`: merged by assistant id; nearest scope wins per assistant.
- `repositories`: merged by repository name across scopes.
- `skills` inside a repository: merged by skill path; nearest scope can enable/disable or override metadata for that skill.

This lets you keep a stable team config while still doing temporary personal changes locally.

### Practical examples

Team baseline in project scope:

```sh
skiui repo add https://github.com/vercel-labs/agent-skills --scope project
skiui skill enable agent-skills code-review --scope project
skiui agent enable codex --scope project
```

Personal local override in the same repo:

```sh
skiui agent enable claude --scope local
skiui skill enable agent-skills my-experimental-skill --scope local
```

The second set only affects your local effective config for that repo; project/global config stays unchanged.

## CI and Releases

- Pull requests run CI checks for install, lint, typecheck, test, and a compiled CLI build.
- Tags matching `v*` trigger release builds for Linux (`x64`, `arm64`), macOS (`x64`, `arm64`), and Windows (`x64`).
- Release assets use the format `skiui-vX.Y.Z-<os>-<arch>.(tar.gz|zip)` with sidecar checksum files named `<asset>.sha256`.
- A combined `checksums.txt` file is also uploaded to each tag release.
