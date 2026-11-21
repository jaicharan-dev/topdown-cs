/**
 * Checks contentManifest.json against the routes Docusaurus actually builds.
 *
 * The manifest derives each page's URL from its file path, because it is
 * generated BEFORE the build and so cannot read Docusaurus's own route table.
 * That derivation has to replicate one rule: a leading number prefix is
 * stripped from directory names (`dsa/9-trees` is served at `dsa/trees`) but
 * not from the last segment, which an explicit frontmatter `id` overrides.
 *
 * This script closes that loop. It reads .docusaurus/globalData.json, written
 * by `npm start` or `npm run build`, and compares every route and every id.
 * Run it after changing the manifest generator, a docs directory name, or a
 * frontmatter id:
 *
 *   npm start   (or npm run build, once)
 *   npm run manifest:verify
 */

const fs = require('fs');
const path = require('path');

const globalDataFile = path.resolve(__dirname, '../.docusaurus/globalData.json');
const manifestFile = path.resolve(__dirname, '../src/data/contentManifest.json');

if (!fs.existsSync(globalDataFile)) {
  console.error(
    '[verify-manifest] .docusaurus/globalData.json not found. Run `npm start` ' +
      'or `npm run build` once so Docusaurus writes its route table, then ' +
      'run this again.'
  );
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const versions =
  JSON.parse(fs.readFileSync(globalDataFile, 'utf8'))[
    'docusaurus-plugin-content-docs'
  ].default.versions;

// path by last id segment, which is what the manifest keys on
const real = new Map();
const collisions = [];
for (const version of versions) {
  for (const doc of version.docs) {
    const bare = doc.id.split('/').pop();
    if (real.has(bare)) collisions.push(bare);
    real.set(bare, { path: doc.path, fullId: doc.id });
  }
}

const problems = [];

if (collisions.length) {
  problems.push(
    `Docusaurus has ${collisions.length} doc(s) whose final id segment is not ` +
      `unique, so a progress record could not tell them apart: ` +
      collisions.join(', ')
  );
}

const realCount = real.size;
if (realCount !== manifest.totalPages) {
  problems.push(
    `page count disagrees: manifest has ${manifest.totalPages}, Docusaurus ` +
      `built ${realCount}`
  );
}

for (const page of manifest.pages) {
  const built = real.get(page.id);
  if (!built) {
    problems.push(`id "${page.id}" is in the manifest but not in the build`);
    continue;
  }
  if (built.path !== page.url) {
    problems.push(
      `url wrong for "${page.id}": manifest says ${page.url}, built route is ` +
        built.path
    );
  }
  real.delete(page.id);
}

for (const [id, built] of real) {
  problems.push(`id "${id}" (${built.path}) was built but is not in the manifest`);
}

// The rank ladder uses absolute point thresholds so that publishing new pages
// never demotes anybody (see src/lib/ranks.js). The price is that the top rank
// becomes unreachable if the content ever shrinks below it, which would be
// invisible until a user asked why they were stuck one rank short.
//
// ranks.js is an ES module and this script is CommonJS, so read the thresholds
// out of the source rather than importing it and dragging in a build step.
const ranksSource = fs.readFileSync(
  path.resolve(__dirname, '../src/lib/ranks.js'),
  'utf8'
);
const thresholds = [...ranksSource.matchAll(/\bat:\s*(\d+)/g)].map((m) =>
  Number(m[1])
);
if (!thresholds.length) {
  problems.push('could not find any rank thresholds in src/lib/ranks.js');
} else {
  const top = Math.max(...thresholds);
  if (top > manifest.totalPoints) {
    problems.push(
      `the top rank needs ${top} points but the site only offers ` +
        `${manifest.totalPoints}, so nobody can reach it: lower the top ` +
        `threshold in src/lib/ranks.js or add content`
    );
  }
}

if (problems.length) {
  console.error(`[verify-manifest] ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[verify-manifest] OK: ${manifest.totalPages} pages, every id and url ` +
    `matches the built routes.`
);
