# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-02-14

### Changed
- Replace `chalk` with `picocolors` (14x smaller, 2x faster)
- Replace `ora` with `nanospinner` (lighter spinner)
- Extract pure functions to `utils.ts` module for better testability

### Added
- Vitest testing framework with 45 unit tests
- Test coverage threshold (80% for utils module)
- `src/utils.ts` - pure utility functions
- Test scripts: `test`, `test:watch`, `test:coverage`

### Removed
- GitHub Actions workflows (simplified for manual publishing)

## [1.1.0] - 2025-02-14

### Changed
- **BREAKING**: Rewrite source code in TypeScript
- Switch from npm to pnpm for package management
- Build output now in `dist/` directory (ESM + CJS)
- CLI entry changed from `bin/lra.js` to `dist/cli.mjs`

### Added
- TypeScript type definitions (`dist/index.d.ts`)
- npm Provenance support for supply chain security
- Export types for programmatic usage

### Removed
- `test` command (E2E testing should be done by AI using browser automation)
- `verify` command (same reason as above)
- `ui-review` command (UI review should be done by AI directly)
- `e2e.js` module (framework should be business-agnostic)
- `skills/` directory (moved to project-specific configuration)
- `templates/` directory

### Fixed
- Security vulnerabilities in dependencies
- Updated all dependencies to latest versions

### Security
- No known vulnerabilities (verified with `pnpm audit`)

## [1.0.0] - 2024-01-15

### Added
- Initial release
- `init` command to create new LRA projects
- `status` command to show project progress
- `add` command to add features with priorities
- `next` command to get the next pending feature
- `done` command to mark features as completed
- `commit` command to commit progress to git
- `list` command to list all features
- `export` command to export project state
- Automatic generation of `.claude/CLAUDE.md` for Claude Code integration
- Support for multiple project types (web, api, cli, library)
- Priority-based feature sorting (critical > high > medium > low)
- JSON-based state persistence

### Features
- Feature tracking with priorities and categories
- Progress management across sessions
- Git integration with automatic commits
- Claude Code integration via `.claude/CLAUDE.md`

[1.2.0]: https://github.com/dimple-smile/long-running-agent/releases/tag/v1.2.0
[1.1.0]: https://github.com/dimple-smile/long-running-agent/releases/tag/v1.1.0
[1.0.0]: https://github.com/dimple-smile/long-running-agent/releases/tag/v1.0.0
