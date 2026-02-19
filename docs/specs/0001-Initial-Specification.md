# 0001 - Initial Specification

## Overview

I want to build a skill manager for agentic code assistants. It should be possible, at both a global and local project level,
to configure skill repositories (initially Git, but with potential for alternative stores in the future) and skills within
those that should be extracted and subsequently symlinked to enabled agentic coding assistants.

## Entry Points

### CLI

The primary entry point into this library should be through the use of an extensible CLI.

The following commands should be created:

- `skiui init --project/--global` - Initialises the required skiui folders and files with default configurations.
- `skiui add-repo <repo> [--name <repo-name>]` - Adds a repository source (Git URL or filesystem path) to the configuration file.
  If `--name` is provided, that repository name is used. If `--global` is specified, the repository will be added to the
  global configuration file.
- `skiui enable-skill <repo-name> <skill-name>` - Enables a skill in a configured repository. If `--global` is specified,
  the skill will be enabled in the global configuration file.
- `skiui apply` - Fetches enabled repositories and applies symlinks for any enabled skills. If in a skiui enabled project, applies
  at both the project and global level. Else, applies at the global level.
- `skiui list` - Lists enabled repositories and skills, as well as the scope they're enabled at.
- `skiui config` - Outputs the current configuration (the merged configuration if at the project level)

## Processes

### Initialisation

When initialising a project: the skiui cache paths should be added to the `.gitignore` file and a local filesystem source
should be configured within the project's `.skiui/skiui.json` file. The project should also be added to the global
configuration file's `"projects"` cache.

### Configuration

It should be possible to configure enabled agentic coding assistants, repositories and skills at both a global level (i.e.
`~/.config/skiui/skiui.json`), a shared project level (`.skiui/skiui.json`), and a local project level (`.skiui/skiui.local.json`).
Preference should be in the following hierarchy: local project, project, global.

The configuration should look something like the following:

```jsonc
{
  // Global only
  "projects": [
    {
      "path": "/path/to/project",
      "lastRefreshed": "2026-01-01T01:01:01Z",
      "lastFetched": "2026-01-01T01:01:01Z",
    },
  ],
  // Global and project level
  "cachePath": ".skiui/repos", // or `.config/skiui/repos` for global level configurations
  "assistants": {
    "claude-code": "enabled",
    "opencode": "enabled",
    "copilot": "disabled", // default
    // ...etc
  },
  "repositories": [
    {
      "name": "local",
      "lastRefreshed": "2026-01-01T01:01:01Z",
      "lastFetched": "2026-01-01T01:01:01Z",
      "source": {
        "type": "fs",
        "path": ".skiui/local/",
      },
      "skills": [
        {
          "path": "my-best-skill", // relative to the source path
          "name": "my-best-skill",
          "description": "my-best-skill description",
          "enabled": true,
        },
      ],
    },
    {
      "name": "foo",
      "lastRefreshed": "2026-01-01T01:01:01Z",
      "lastFetched": "2026-01-01T01:01:01Z",
      "source": {
        "type": "git",
        "url": "https://github.com/example/test",
        "path": "skills", // optional and default
        "branch": "master", // optional
      },
      "skills": [
        {
          "path": "my-best-skill", // relative to the source path
          "name": "my-best-skill",
          "description": "my-best-skill description",
          "enabled": true,
        },
      ],
    },
  ],
  "version": 1,
}
```

### Skill Cloning/Application

When skill repositories and associated skills are enabled and subsequently applied, git repositories should be fetched from their
relevant source into the configured cache path, while filesystem repositories should be read directly from their source path. The
skills should then be catalogued in the configuration under each repository, with their name and description extracted from their
SKILL.md metadata. Enabled skills should then be symlinked (in a cross platform way) into each enabled agentic assistant skills path
(i.e. to `.claude/skills` or `.opencode/skills`).

If a filesystem source path overlaps with a destination assistant path, the apply process should fail with a clear error.

This process should also ensure relevant agentic assistant skill paths and skiui paths are excluded from Git repositories.

## Standards

### Cross Platform

All functionality should work across major platforms such as Linux, Windows and Mac. Utility functions should be created where
functionality differs (i.e. `utils/fs.ts` could contain a cross-platform `makeSymlink`).

### Testing

As much of the implemented application should be built with tests as possible and with testability in mind.

### Tooling

This application should be implemented as a Bun application. The CLI should be powered by `yargs`, and the TUI (if ever
added) should be powered by `Ink`.

`mise-en-place` should be used to manage local development tools.

## References

### File Structure

The application should be built with the addition of a TUI in mind. To that end, a structure similar to the following
should be implemented:

```
src/
  lib/
    utils/
    config/
    repos/
    projects/
  apps/
    tui/
    cli/
    index.ts
```
