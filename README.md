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

## CLI

- `skiui init` initializes global and project config for the current repository.
- `skiui init` also creates `.skiui/AGENTS.md` in project scope as the default rules source file.
- `skiui init --global` initializes only global config.
- `skiui add-repo <repo> [--name <repo-name>] [--global]` adds a repository source (Git URL or filesystem path).
- `skiui agent enable <assistant-id> [--scope <local|project|global>]` enables an assistant in a specific config scope.
- `skiui agent disable <assistant-id> [--scope <local|project|global>]` disables an assistant in a specific config scope.
- `skiui enable-skill <repo-name> <skill-name> [--global]` enables a skill in a configured repository.
- `skiui apply` syncs repositories, links enabled skills, and links rules from `rulesPath` (default `.skiui/AGENTS.md`) into enabled assistants' rule files (git sources are cached, filesystem sources are linked directly from source paths, and overlapping source/destination paths are rejected).
- `skiui list` lists enabled skills by config scope.
- `skiui config` prints the effective merged config.

## CI and Releases

- Pull requests run CI checks for install, lint, typecheck, test, and a compiled CLI build.
- Tags matching `v*` trigger release builds for Linux (`x64`, `arm64`), macOS (`x64`, `arm64`), and Windows (`x64`).
- Release assets use the format `skiui-vX.Y.Z-<os>-<arch>.(tar.gz|zip)` with sidecar checksum files named `<asset>.sha256`.
- A combined `checksums.txt` file is also uploaded to each tag release.
