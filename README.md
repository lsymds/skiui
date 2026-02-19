# skiui

TUI and CLI based multi-agent skill manager.

## CLI

- `skiui init` initializes global and project config for the current repository.
- `skiui init` also creates `.skiui/AGENTS.md` in project scope as the default rules source file.
- `skiui init --global` initializes only global config.
- `skiui add-repo <repo> [--name <repo-name>] [--global]` adds a repository source (Git URL or filesystem path).
- `skiui enable-skill <repo-name> <skill-name> [--global]` enables a skill in a configured repository.
- `skiui apply` syncs repositories, links enabled skills, and links rules from `rulesPath` (default `.skiui/AGENTS.md`) into enabled assistants' rule files (git sources are cached, filesystem sources are linked directly from source paths, and overlapping source/destination paths are rejected).
- `skiui list` lists enabled skills by config scope.
- `skiui config` prints the effective merged config.
