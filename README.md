# opam-workerd

The opam package `workerd`. It installs the prebuilt
[workerd](https://github.com/cloudflare/workerd) binary from Cloudflare, so you
do not need `npm install`. It does not build workerd from source, because the
workerd build needs Bazel.

## Install

```sh
opam install workerd
workerd --version
```

The package installs one file: `bin/workerd`.

## Limits

- opam cannot select a download by platform. The package lists the four npm
  tarballs of `@cloudflare/workerd-<platform>` as `extra-source`, so every
  install downloads all four (about 154 MiB). A command filtered by `os` and
  `arch` unpacks the one that fits your system.
- Supported: Linux and macOS, x86_64 and arm64. Linux needs glibc 2.35 or
  later. Windows is not supported.
- The package version is the version of the npm package `workerd`, for example
  `1.20261019.1`.
- Only the workerd version that the latest `wrangler` pins is released. npm has
  a new workerd almost every day.

The opam file has the license of workerd (Apache-2.0). The scripts in this
repository have the MIT license (see `LICENSE`).

## Releases

The workflow `sync.yml` runs every day. It does these steps:

1. `node scripts/update.ts` reads the npm registry. It finds the workerd
   version that the latest `wrangler` pins. For a new version, it writes
   `workerd.opam` and a section `## <version>` in `CHANGES.md`. The script
   needs Node.js 22.18 or later.
2. It commits the change to `main`.
3. It releases the newest version in `CHANGES.md` when the repository has no tag
   with this version and `ocaml/opam-repository` has no
   `packages/workerd/workerd.<version>`. It pushes the commit and the tag
   together.
4. The tag starts `release.yml`. It runs
   [dune-release-action](https://github.com/davesnx/dune-release-action),
   which makes the GitHub release and opens the pull request on
   `ocaml/opam-repository`.

The secret `GH_TOKEN` must push to `main` and to tags, and must open pull
requests on `ocaml/opam-repository` from the fork of the token owner. A tag
pushed with the default `GITHUB_TOKEN` does not start workflows.

Check the scripts with `npm ci && npm run check` in `scripts/`.
