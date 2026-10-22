import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Npm = {
  version: string;
  dist: { tarball: string; integrity: string };
  dependencies?: Record<string, string>;
};

const platforms = [
  { npm: "linux-64", os: "linux", arch: "x86_64" },
  { npm: "linux-arm64", os: "linux", arch: "arm64" },
  { npm: "darwin-64", os: "macos", arch: "x86_64" },
  { npm: "darwin-arm64", os: "macos", arch: "arm64" },
] as const;

const root = join(import.meta.dirname, "..");

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const isVersion = (value: string | undefined): value is string =>
  value !== undefined && /^\d+\.\d+\.\d+$/.test(value);

const fetchNpm = async (name: string, version: string): Promise<Npm> => {
  const url = `https://registry.npmjs.org/${name.replace("/", "%2f")}/${version}`;
  const response = await fetch(url);
  if (!response.ok) return fail(`${url}: HTTP ${response.status}`);
  return (await response.json()) as Npm;
};

const sha512Hex = (integrity: string): string => {
  const [algorithm, digest] = integrity.split("-");
  if (algorithm !== "sha512" || digest === undefined) {
    return fail(`Expected a sha512 integrity, got ${integrity}`);
  }
  return Buffer.from(digest, "base64").toString("hex");
};

const targetVersion = async (): Promise<string> => {
  const requested = process.argv[2];
  if (requested !== undefined) {
    return isVersion(requested) ? requested : fail(`Not a version: ${requested}`);
  }
  const wrangler = await fetchNpm("wrangler", "latest");
  const pinned = (await fetchNpm("wrangler", wrangler.version)).dependencies?.["workerd"];
  return isVersion(pinned)
    ? pinned
    : fail(`wrangler ${wrangler.version} pins workerd ${pinned}, not an exact version`);
};

type Source = { platform: (typeof platforms)[number]; npm: Npm };

const opamFile = (version: string, sources: Source[]): string => `opam-version: "2.0"
synopsis: "The workerd runtime for Cloudflare Workers"
description:
  "Installs the prebuilt workerd binary from Cloudflare for your platform: Linux or macOS, x86_64 or arm64. Linux needs glibc 2.35 or later."
maintainer: ["David Sancho <dsnxmoreno@gmail.com>"]
authors: ["Cloudflare, Inc."]
license: "Apache-2.0"
homepage: "https://github.com/ml-in-barcelona/opam-workerd"
bug-reports: "https://github.com/ml-in-barcelona/opam-workerd/issues"
dev-repo: "git+https://github.com/ml-in-barcelona/opam-workerd.git"
x-maintenance-intent: ["(latest)"]
version: "${version}"
available: [ (os = "linux" | os = "macos") & (arch = "x86_64" | arch = "arm64") ]
depends: []
build: [
  ["tar" "-xzf"
${platforms
  .map((p) => `    "workerd-${p.npm}.tgz" {os = "${p.os}" & arch = "${p.arch}"}`)
  .join("\n")}
  ]
]
install: [
  ["install" "-m" "755" "package/bin/workerd" "%{bin}%/workerd"]
]
${sources
  .map(
    ({ platform, npm }) => `extra-source "workerd-${platform.npm}.tgz" {
  src: "${npm.dist.tarball}"
  checksum: "sha512=${sha512Hex(npm.dist.integrity)}"
}`,
  )
  .join("\n")}
`;

const addSection = (text: string, version: string): string => {
  const lines = text.split("\n");
  const first = lines.findIndex((line) => line.startsWith("## "));
  const section = [`## ${version}`, "", `- Update to workerd ${version}.`, ""];
  if (first === -1) return `${text.trimEnd()}\n\n${section.join("\n")}`;
  return [...lines.slice(0, first), ...section, ...lines.slice(first)].join("\n");
};

const main = async (): Promise<void> => {
  const version = await targetVersion();
  const changes = join(root, "CHANGES.md");
  const text = readFileSync(changes, "utf8");
  if (text.split("\n").includes(`## ${version}`)) return;
  const sources = await Promise.all(
    platforms.map(async (platform) => ({
      platform,
      npm: await fetchNpm(`@cloudflare/workerd-${platform.npm}`, version),
    })),
  );
  writeFileSync(join(root, "workerd.opam"), opamFile(version, sources));
  writeFileSync(changes, addSection(text, version));
  console.log(`workerd ${version}`);
};

await main();
