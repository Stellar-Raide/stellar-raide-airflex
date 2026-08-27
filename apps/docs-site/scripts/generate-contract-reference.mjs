#!/usr/bin/env node
// -----------------------------------------------------------------------------
// generate-contract-reference.mjs
//
// Walks contracts/*/src/lib.rs, extracts every `pub fn` inside a
// `#[contractimpl] impl ... { ... }` block that is preceded by a `///` doc
// comment, and writes one MDX page per contract under
// pages/contract-reference/<contract>.mdx.
//
// This keeps the Contract Reference section in sync with the Rust source —
// update the doc comments in the contract, re-run `npm run generate`, and
// the docs site picks up the change. No manual MDX editing required for
// contracts that already exist.
// -----------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(SITE_ROOT, "../../");
const CONTRACTS_DIR = path.join(REPO_ROOT, "contracts");
const OUT_DIR = path.join(SITE_ROOT, "pages", "contract-reference");

/** Reads the `name = "..."` value out of a contract's Cargo.toml. */
function readCrateName(cargoTomlPath, fallback) {
  try {
    const toml = fs.readFileSync(cargoTomlPath, "utf8");
    const match = toml.match(/^\s*name\s*=\s*"([^"]+)"/m);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Extracts documented `pub fn` items from a `#[contractimpl] impl Foo { ... }`
 * block. Returns an array of { name, signature, doc, returns }.
 */
function extractDocumentedFns(source) {
  const implMatch = source.match(
    /#\[contractimpl\]\s*impl\s+\w+\s*\{([\s\S]*?)\n\}\n/
  );
  if (!implMatch) return [];
  const body = implMatch[1];

  // Split into lines and scan for runs of `///` immediately followed by a
  // `pub fn` signature (possibly spanning multiple lines up to the `{`).
  const lines = body.split("\n");
  const fns = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("///")) continue;

    // Collect the contiguous doc-comment block.
    const docLines = [];
    let j = i;
    while (j < lines.length && lines[j].trim().startsWith("///")) {
      docLines.push(lines[j].trim().replace(/^\/\/\/\s?/, ""));
      j++;
    }

    // Skip blank lines between the doc block and the fn signature.
    while (j < lines.length && lines[j].trim() === "") j++;

    if (j < lines.length && /^pub fn /.test(lines[j].trim())) {
      // Collect the full signature — it may span multiple lines until `{`.
      let sig = "";
      let k = j;
      while (k < lines.length) {
        sig += lines[k] + "\n";
        if (lines[k].includes("{")) break;
        k++;
      }
      sig = sig.replace(/\{\s*$/, "").trim();

      const nameMatch = sig.match(/^pub fn\s+([A-Za-z0-9_]+)/);
      fns.push({
        name: nameMatch ? nameMatch[1] : "unknown",
        signature: sig,
        doc: docLines.join("\n").trim(),
      });
      i = k;
    }
  }

  return fns;
}

function toTitleCase(slug) {
  return slug
    .split(/[-_]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function renderMdx(contractDirName, crateName, fns, sourceRelPath) {
  const title = `${toTitleCase(contractDirName)} Contract`;
  const fnSections = fns
    .map((fn) => {
      return [
        `### \`${fn.name}\``,
        "",
        fn.doc || "_No description provided._",
        "",
        "```rust",
        fn.signature,
        "```",
        "",
      ].join("\n");
    })
    .join("\n---\n\n");

  return `---
title: ${title}
---

import { Callout } from "nextra/components";

# ${title}

<Callout type="info">
  Generated from the \`///\` doc comments in
  [\`${sourceRelPath}\`](https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/blob/main/${sourceRelPath}).
  Run \`npm run generate:contracts\` in \`apps/docs-site\` after editing the
  contract to refresh this page.
</Callout>

Crate: \`${crateName}\`

## Public Functions

${fnSections || "_No documented public functions found._"}
`;
}

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.warn(`[generate-contract-reference] No contracts/ dir at ${CONTRACTS_DIR}, skipping.`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const contractDirs = fs
    .readdirSync(CONTRACTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const generated = [];

  for (const dirName of contractDirs) {
    const libRsPath = path.join(CONTRACTS_DIR, dirName, "src", "lib.rs");
    if (!fs.existsSync(libRsPath)) continue;

    const source = fs.readFileSync(libRsPath, "utf8");
    const cargoTomlPath = path.join(CONTRACTS_DIR, dirName, "Cargo.toml");
    const crateName = readCrateName(cargoTomlPath, dirName);
    const fns = extractDocumentedFns(source);

    const sourceRelPath = path
      .relative(REPO_ROOT, libRsPath)
      .split(path.sep)
      .join("/");

    const mdx = renderMdx(dirName, crateName, fns, sourceRelPath);
    const outPath = path.join(OUT_DIR, `${dirName}.mdx`);
    fs.writeFileSync(outPath, mdx, "utf8");
    generated.push(dirName);
    console.log(
      `[generate-contract-reference] Wrote ${path.relative(SITE_ROOT, outPath)} (${fns.length} documented fn(s))`
    );
  }

  if (generated.length === 0) {
    console.warn("[generate-contract-reference] No contract crates found under contracts/*/src/lib.rs.");
  }

  // Build _meta.json: generated contracts first (alphabetical), then any
  // hand-written placeholder pages already sitting in the output dir
  // (e.g. marketplace.mdx / token.mdx for contracts that don't exist yet).
  const meta = { index: "Overview" };
  for (const dirName of generated.sort()) {
    meta[dirName] = toTitleCase(dirName);
  }
  const existingFiles = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".mdx") && f !== "index.mdx");
  for (const file of existingFiles) {
    const slug = file.replace(/\.mdx$/, "");
    if (!(slug in meta)) meta[slug] = toTitleCase(slug);
  }
  fs.writeFileSync(path.join(OUT_DIR, "_meta.json"), JSON.stringify(meta, null, 2) + "\n", "utf8");
}

main();
