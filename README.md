# skiui

TUI and CLI based multi-agent skill manager.

## CLI

- `skiui init` initializes global and project config for the current repository.
- `skiui init --global` initializes only global config.
- `skiui add-repo <repo> [--name <repo-name>] [--global]` adds a repository source (Git URL or filesystem path).
- `skiui enable-skill <repo-name> <skill-name> [--global]` enables a skill in a configured repository.
- `skiui apply` syncs repositories and links enabled skills into enabled assistants.
- `skiui list` lists enabled skills by config scope.
- `skiui config` prints the effective merged config.
