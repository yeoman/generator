# Changelog

## [9.1.0](https://github.com/yeoman/generator/compare/v9.0.0...v9.1.0) (2026-09-12)

### Features

- add allowPackageTemplates feature ([#1855](https://github.com/yeoman/generator/issues/1855)) ([a9d69dd](https://github.com/yeoman/generator/commit/a9d69dd2a7357ab26c491930166bc3b5f0183c35))
- create destination root on demand at createSimpleGit ([#1854](https://github.com/yeoman/generator/issues/1854)) ([c1c5425](https://github.com/yeoman/generator/commit/c1c54250361afe8fe1d6fce126a915340e88f31f))

## [9.0.0](https://github.com/yeoman/generator/compare/v8.4.0...v9.0.0) (2026-09-11)

### ⚠ BREAKING CHANGES

- do not eagerly create destinationRoot folder, create on demand at spawn ([#1852](https://github.com/yeoman/generator/issues/1852))
- update execa to v10 ([#1850](https://github.com/yeoman/generator/issues/1850))
- drop node 20 support and update dependencies ([#1849](https://github.com/yeoman/generator/issues/1849))
- `templatePath()` and `destinationPath()` throw when the resolved path is outside the source/destination root.

### Features

- do not eagerly create destinationRoot folder, create on demand at spawn ([#1852](https://github.com/yeoman/generator/issues/1852)) ([0a14c27](https://github.com/yeoman/generator/commit/0a14c271a423c124078f7d71887c5967eaf1b766))
- drop node 20 support and update dependencies ([#1849](https://github.com/yeoman/generator/issues/1849)) ([3cff385](https://github.com/yeoman/generator/commit/3cff3857ab54d6f06fcce6b62d3de0e9216684b3))
- throw when `templatePath()`/`destinationPath()` resolve outsid… ([#1848](https://github.com/yeoman/generator/issues/1848)) ([fb8de1b](https://github.com/yeoman/generator/commit/fb8de1b238ae91a53fc32b2166ac08fe7009f79f))
- update execa to v10 ([#1850](https://github.com/yeoman/generator/issues/1850)) ([6f8320f](https://github.com/yeoman/generator/commit/6f8320fd3d9f224b79dcf772c12ed6f88ebd018a))

### Bug Fixes

- resolve `moveDestination` source against the destination root ([#1846](https://github.com/yeoman/generator/issues/1846)) ([db42587](https://github.com/yeoman/generator/commit/db42587643d1a97c47b29cc30b5de8f5115ceee8))

## [8.4.0](https://github.com/yeoman/generator/compare/v8.3.2...v8.4.0) (2026-09-07)

### Features

- add editorMetadata support to fs helpers ([#1843](https://github.com/yeoman/generator/issues/1843)) ([3696d42](https://github.com/yeoman/generator/commit/3696d42a381c828d94cd43980c6c1e5ed1651776))

## [8.3.2](https://github.com/yeoman/generator/compare/v8.3.1...v8.3.2) (2026-09-07)

### Bug Fixes

- loose mem-fs dependency ([#1841](https://github.com/yeoman/generator/issues/1841)) ([c3f1758](https://github.com/yeoman/generator/commit/c3f17589b692a09b9d7820aafd9fcd86584ebc93))

## [8.3.1](https://github.com/yeoman/generator/compare/v8.3.0...v8.3.1) (2026-09-05)

### Bug Fixes

- support delete in Storage proxy's ([#1838](https://github.com/yeoman/generator/issues/1838)) ([f0372d3](https://github.com/yeoman/generator/commit/f0372d3b421f17c5e718055256c3099b31236645))

## [8.3.0](https://github.com/yeoman/generator/compare/v8.2.2...v8.3.0) (2026-08-24)

### Features

- optionally use meta.getPackageJson for rootGeneratorName and rootGeneratorVersion ([#1834](https://github.com/yeoman/generator/issues/1834)) ([ca58b19](https://github.com/yeoman/generator/commit/ca58b198a9c6e038646107a221722dd074dd2a42))

## [8.2.2](https://github.com/yeoman/generator/compare/v8.2.1...v8.2.2) (2026-04-29)

### Bug Fixes

- try to avoid could be instantiated with a different subtype of constraint issue ([#1798](https://github.com/yeoman/generator/issues/1798)) ([2a83721](https://github.com/yeoman/generator/commit/2a837218858bb5384d3873e5a585f9b5123b882a))

## [8.2.1](https://github.com/yeoman/generator/compare/v8.2.0...v8.2.1) (2026-04-28)

### Bug Fixes

- add return type to avoid complex type generation ([#1795](https://github.com/yeoman/generator/issues/1795)) ([ddb534c](https://github.com/yeoman/generator/commit/ddb534c0c2011223e428014439e5b445e4793e1c))

## [8.2.0](https://github.com/yeoman/generator/compare/v8.1.2...v8.2.0) (2026-04-28)

### Features

- add createSimpleGit ([#1771](https://github.com/yeoman/generator/issues/1771)) ([5426124](https://github.com/yeoman/generator/commit/54261245e5e7e9f53e27f0020abe52f432c5d938))

### Bug Fixes

- add support to @yeoman/types v1.11.0 ([#1785](https://github.com/yeoman/generator/issues/1785)) ([af78c13](https://github.com/yeoman/generator/commit/af78c13df6ec3c2aa6b9fed889406e4d08535f2d))
- pass selected env variables to simple-git ([#1770](https://github.com/yeoman/generator/issues/1770)) ([5338470](https://github.com/yeoman/generator/commit/53384707c8d0388e613b1cb2f75390347eeb586a))
