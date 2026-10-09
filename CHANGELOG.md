# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.7] - 2026-10-09

### Added

- Added Husky pre-commit checks for Biome linting and TypeScript typechecking.
- Added npm installation and publishing documentation for `@ekworp/opencode-mystatus`.

### Fixed

- Applied Biome fixes across the plugin source files.

## [1.2.6] - 2026-10-09

### Added

- Migrated the plugin to the OpenCode V2 plugin API.
- Added GitHub Actions publishing for the scoped npm package and GitHub Releases.
- Added Biome for linting and formatting.

### Changed

- Changed the npm package name to `@ekworp/opencode-mystatus`.
- Added a single-file bundled plugin build for GitHub Release downloads.
- Updated installation and development documentation for OpenCode V2 and pnpm.

### Fixed

- Skip GitHub Copilot and Google quota queries when those platforms are not configured.

## [1.2.2] - 2026-01-14

### Documentation

- Updated installation instructions in `README.md` and `README.zh-CN.md` to remove version constraints, allowing for automatic updates.

## [1.2.1] - 2026-01-14

### Fixed

- Remove unused `maskString` import in `copilot.ts` to fix lint error

## [1.2.0] - 2026-01-14

### Added

- Support for GitHub Copilot account quota tracking (Premium requests)
- New `copilot.ts` module for GitHub internal API integration
- Updated `README.md` and `README.zh-CN.md` with Copilot documentation

## [1.0.1] - 2026-01-11

### Fixed

- Include `command/` directory in npm package for slash command support

## [1.0.0] - 2026-01-11

### Added

- Initial release
- Query OpenAI account quota (Plus/Team/Pro)
- Query Zhipu AI account quota (Coding Plan)
- Query Google Cloud account quota (Antigravity)
- Visual progress bars for quota display
- Multi-language support (Chinese/English)
- API key masking for security
