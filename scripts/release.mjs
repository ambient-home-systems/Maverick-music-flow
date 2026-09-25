import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { formatMessages, transform } from "esbuild";

import { extractCardVersion } from "../src/core/version-utils.js";

// Post-build step for `vite build`. Vite's lib mode leaves whitespace in ES
// output on purpose, so this script finishes the job: it verifies the version
// banner, minifies whitespace and syntax, prepends the license notices for the
// project and the code bundled into it, and copies the brand images that the
// README and HACS listing reference. Everything HACS downloads lives in dist/,
// so nothing else is written there.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");
const bundlePath = path.join(distDir, "maverick-music.js");
const sourceMainPath = path.join(rootDir, "src", "maverick-music.js");
const brandDir = path.join(rootDir, "docs", "brand");
const brandAssets = [
  "homeii-flow-logo.svg",
  "homeii-flow-logo.png",
  "homeii-flow-logo-v2.png",
  "homeii-flow-icon.png",
];

const LICENSE_BANNER_MARKER = "@license MIT — Maverick Music";

function licenseBanner(version) {
  return `/*!
 * @license MIT — Maverick Music ${version}
 * https://github.com/ambient-home-systems/maverick-music-flow
 *
 * MIT License
 *
 * Copyright (c) 2026 r11a (original HOMEii Music Flow) and Ambient Home Systems
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This bundle also contains the following third-party code:
 *
 * Sendspin browser client (sendspin-js), https://github.com/Sendspin/sendspin-js
 * Copyright (c) Sendspin Protocol Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. The full license text is kept at
 * src/sendspin-js/LICENSE in the repository.
 *
 * Embla Carousel, https://github.com/davidjerleke/embla-carousel
 * MIT License, Copyright (c) David Jerleke.
 *
 * opus-encdec (Opus JS Encoder / Decoder), https://github.com/mmig/opus-encdec
 * MIT License, Original Work Copyright (c) 2013 Matt Diamond,
 * Modified Work Copyright (c) 2014 Christopher Rudmin.
 */
`;
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString("en-US")} bytes (${(bytes / 1024 / 1024).toFixed(2)} MB)`;
}

function reportSize(label, text) {
  const raw = Buffer.byteLength(text, "utf8");
  const gzip = gzipSync(text, { level: 9 }).length;
  console.log(`${label}: ${formatBytes(raw)}, gzip ${formatBytes(gzip)}`);
}

const packageMetadata = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const version = packageMetadata.version;

const sourceVersion = extractCardVersion(await readFile(sourceMainPath, "utf8"));
if (sourceVersion !== version) {
  throw new Error(`src/maverick-music.js declares ${sourceVersion} but package.json is ${version}`);
}

let bundle;
try {
  bundle = await readFile(bundlePath, "utf8");
} catch (error) {
  throw new Error(`Missing ${path.relative(rootDir, bundlePath)}; run \`vite build\` first`, { cause: error });
}
const versionBanner = `/*! MAVERICK_CARD_VERSION = "${version}"; */`;
if (extractCardVersion(bundle) !== version || !bundle.includes(versionBanner)) {
  throw new Error(`Built bundle must carry ${versionBanner} to match package.json`);
}

if (bundle.includes(LICENSE_BANNER_MARKER)) {
  console.log(`dist/maverick-music.js ${version} is already minified and carries the license banner; leaving it as is`);
} else {
  reportSize("Vite output", bundle);
  const result = await transform(bundle, {
    // Vite already renamed module-scope identifiers. Leave identifiers alone
    // here so the names Home Assistant reaches for stay exactly as written.
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,
    legalComments: "inline",
    target: "es2020",
    format: "esm",
    charset: "utf8",
    sourcefile: "maverick-music.js",
    logLevel: "silent",
  });
  if (result.warnings.length) {
    const messages = await formatMessages(result.warnings, { kind: "warning", color: false });
    console.warn(`esbuild reported ${result.warnings.length} warning(s):\n${messages.join("")}`);
  }
  if (!result.code.includes(versionBanner)) {
    throw new Error("Minification dropped the version banner");
  }
  const output = `${licenseBanner(version)}${result.code}${result.code.endsWith("\n") ? "" : "\n"}`;
  await writeFile(bundlePath, output);
  reportSize("Release bundle", output);
}

await mkdir(distDir, { recursive: true });
for (const asset of brandAssets) {
  await copyFile(path.join(brandDir, asset), path.join(distDir, asset));
}

console.log(`Prepared dist/ for Maverick Music ${version}: maverick-music.js + ${brandAssets.join(", ")}`);
