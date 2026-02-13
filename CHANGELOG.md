# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/dimple-smile/long-running-agent/releases/tag/v1.0.0
