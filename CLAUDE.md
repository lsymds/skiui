# skiui

skiui is a TUI and CLI based multi-agent skill manager

## General

- Built with Bun
- Specification driven for large features based on documents persisted in `docs/specs/`
- README.md should be kept up to date with useful user information (i.e. how to use the application)
- CLAUDE.md should be kept up to date with useful agent information (i.e. what NOT to do)
- Tests should be co-located with the code they cover (e.g. `foo.test.ts` beside `foo.ts`)

## Git

- Commit with conventional commits

## Testing

- Override global config path in tests with `SKIUI_GLOBAL_CONFIG_DIR` (always point to a temp dir)
- Prefer testing through public entrypoints: CLI (`src/apps/cli/index.ts`) or config services (`initConfig`, `loadEffectiveConfig`, `addSkill`, `listEnabledSkills`)
- For service-level tests, pass explicit `cwd` and `env` options; do not rely on real user home/config paths
