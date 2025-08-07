# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Upgraded libraries to maintain security

## [1.0.9] - 2025-04-29
### Fixed
- Upgrade SDK and CLI dependencies
- Support for Node 20

## [1.0.8] - 2025-02-24
### Fixed
- Fixed issues with npm dependencies tree (not available old packages)

## [1.0.7] - 2025-02-20
### Fixed
- Insert script tag in applet with live reload properly to prevent browser to parse html in quirks mode

## [1.0.6] - 2025-02-13
### Fixed
- Insert script tag with applet info properly to prevent browser to parse html in quirks mode

## [1.0.5] - 2024-09-26
### Fixed
- Stopping Applet Server will not keep the process running in the background for a short time
- Fixed missing production dependencies of package in published npm package on registry.npmjs.org

## [1.0.4] - 2024-09-26
### Fixed
- Upgrade SDK and CLI dependencies

## [1.0.3] - 2023-05-19
### Fixed
- Upgrade SDK and CLI dependencies

## [1.0.2] - 2023-05-03
### Fixed
- Prevent error "ERESOLVE" because of new peer dependency resolution in npm 7 (`--force`, or `--legacy-peer-deps` not required anymore)

## [1.0.1] - 2023-04-01
### Fixed
- Reload devices when no one has connected yet
- Works correctly even on Windows systems

## [1.0.0] - 2023-03-29
### Fixed
- Console output of `npm start` of generated applet shows correct URL of emulator
- Report current version of plugin to server using `User-Agent` header
- Support `SOS_PROFILE` environment variable to set the profile for the plugin

### Changed
- The options currently contains only required `port`, `publicUrl`, `appletPort` and `appletPublicUrl` options
- The compatibility with `@signageos/cli` fewer than 1.1 for `sos device connect` is removed (Use 1.2+ instead)

### Removed
- The options `https`, `useLocalIp`, `host` are not accepted anymore

## [0.3.1] - 2022-11-25
### Fixed
- Removed unused `display.appcache` file from Emulator (replaced with `serviceWorker.js`)

## [0.3.0] - 2022-06-14
### Added
- Support for Webpack 5

## [0.2.0] - 2022-04-06
### Added
- Ask for organization when default is not set yet and offer to save the default organization

## [0.1.2] - 2022-01-18
### Fixed
- Compatibility with peer dependency for front-display version 9.13.0+ (because of changed API)

## [0.1.1] - 2021-02-22
### Fixed
- `localhost:8090` based development of applet works now

## [0.1.0] - 2021-01-29
### Added
- Reloading connected devices after build.

## [0.0.4] - 2020-10-13
### Fixed
- Remove unnecessary dependencies to keep plugin small

### Security
- Fix dependabot alerts

## [0.0.2] - 2020-03-04
### Fixed
- Public registry release
- Universal import for any modules style

## [0.0.1]
### Added
- Package is available in npm registry https://www.npmjs.com/package/@signageos/webpack-plugin (moved from @signageos/cli)
