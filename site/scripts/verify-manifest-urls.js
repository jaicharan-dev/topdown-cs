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

if (problems.length) {
  console.error(`[verify-manifest] ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[verify-manifest] OK: ${manifest.totalPages} pages, every id and url ` +
    `matches the built routes.`
);
