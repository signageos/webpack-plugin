# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Console output of `npm start` of generated applet shows correct URL of emulator
- Report current version of plugin to server using `User-Agent` header
- Support `SOS_PROFILE` environment variable to set the profile for the plugin

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
