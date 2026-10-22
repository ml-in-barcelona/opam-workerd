# opam-workerd

The opam package `workerd`. It installs the prebuilt [workerd](https://github.com/cloudflare/workerd) binary from Cloudflare, so you do not need `npm install`. It does not build workerd from source (since workerd needs Bazel)

## Install

```sh
opam install workerd
workerd --version
```

The package version is the version of the npm package `workerd`, for example `1.20261019.1`.

The opam file has the license of workerd (Apache-2.0). The scripts in this repository have the MIT license (see `LICENSE`).
