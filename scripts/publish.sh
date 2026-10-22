#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pkg=workerd
remote=${REMOTE:-origin}
api=${OPAM_REPOSITORY_API:-https://api.github.com/repos/ocaml/opam-repository/contents/packages}

in_opam_repository() {
  local auth=() code
  [ -z "${GH_TOKEN:-}" ] || auth=(-H "Authorization: Bearer $GH_TOKEN")
  code=$(curl -sS -o /dev/null -w '%{http_code}' "${auth[@]}" "$api/$1/$1.$2")
  case $code in
    200) return 0 ;;
    404) return 1 ;;
    *)
      echo "opam-repository lookup of $1.$2 returned HTTP $code" >&2
      exit 1
      ;;
  esac
}

version=$(grep -m 1 '^## ' CHANGES.md | cut -c 4-)
[ -n "$version" ] || { echo "CHANGES.md has no version section" >&2; exit 1; }

git add -- "$pkg.opam" CHANGES.md
if ! git diff --cached --quiet; then
  git commit -q -m "Update to $pkg $version"
fi

for _ in 1 2 3; do
  release=no
  remote_tag=$(git ls-remote --tags "$remote" "refs/tags/$version")
  if [ -n "$remote_tag" ]; then
    echo "$pkg $version has a tag." >&2
  elif in_opam_repository "$pkg" "$version"; then
    echo "$pkg $version is in opam-repository." >&2
  else
    release=yes
  fi
  if [ "$release" = yes ]; then
    git tag -a "$version" -m "$pkg $version"
    if git push --atomic "$remote" HEAD:main "refs/tags/$version"; then
      echo "Released $pkg $version." >&2
      exit 0
    fi
    git tag -d "$version" >/dev/null
  elif git push "$remote" HEAD:main; then
    exit 0
  fi
  git pull -q --rebase "$remote" main
done
echo "Could not push after three tries." >&2
exit 1
