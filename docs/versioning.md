# Versioning

Nvalope public core releases use [Semantic Versioning](https://semver.org/):
`MAJOR.MINOR.PATCH`.

This policy applies to the public core app in this repository. Premium, private,
or separately distributed features keep their own release and license process
outside this repo.

## Version Bumps

- **MAJOR**: breaking changes to public data formats, documented user flows,
  import/export behavior, or support guarantees.
- **MINOR**: new user-facing features, substantial workflow improvements, new
  settings, or backwards-compatible data changes.
- **PATCH**: bug fixes, copy updates, accessibility fixes, documentation updates,
  and maintenance changes that do not add a new user-facing capability.

When a change could fit more than one category, choose the larger bump if users
need to notice it before updating.

## Changelog Rules

- Keep `[CHANGELOG.md](../CHANGELOG.md)` in SemVer order with `Unreleased` at
  the top.
- Move completed work from `Unreleased` into a dated version section before
  release.
- Group entries under practical headings such as `Added`, `Changed`, `Fixed`,
  `Security`, and `Docs`.
- Write entries for users and maintainers, not as a commit log.
- Mention privacy, storage, import/export, and accessibility changes explicitly
  because they affect user trust and upgrade decisions.

## Release Checklist

1. Confirm all intended changes are represented in the changelog.
2. Update `package.json` and `package-lock.json` to the release version.
3. Update generated docs when their sources changed, especially
   `public/user-guide.html`.
4. Run the normal verification commands:

   ```bash
   npm run build:user-guide
   npm run lint
   npm run test:run
   ```

5. For UI changes, run the relevant browser smoke test or manual browser check.
6. Commit the release changes.
7. Tag the release with `vX.Y.Z`, for example:

   ```bash
   git tag v1.2.0
   git push origin HEAD
   git push origin v1.2.0
   ```

Do not tag a release until the public core branch is ready to publish.

## Current Retroactive Baseline

- `1.1.0` marks the first documented public-core baseline with in-app legal
  pages.
- `1.2.0` captures the accumulated public-core work through May 1, 2026:
  guided onboarding, safer destructive actions, Overview as the default screen,
  storage usage in Settings, idle action suggestions, receipt item dictionary
  terminology, refreshed legal scope, and this versioning policy.
