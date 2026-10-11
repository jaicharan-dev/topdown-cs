const fs = require('fs');
const path = require('path');

const dsaDir = path.resolve(__dirname, '../docs/dsa');
const outDir = path.resolve(__dirname, '../src/data');
const outFile = path.join(outDir, 'dsaStats.json');

// Map directory naming to flowchart node IDs and canonical titles
const TOPIC_METADATA = {
  '1-arrays-hashing': { id: 'arrays-hashing', defaultLabel: 'Arrays & Hashing' },
  '2-strings': { id: 'strings', defaultLabel: 'Strings' },
  '3-math-number-theory': { id: 'math-basics', defaultLabel: 'Math Basics' },
  '4-two-pointers': { id: 'two-pointers', defaultLabel: 'Two Pointers' },
  '5-sliding-window': { id: 'sliding-window', defaultLabel: 'Sliding Window' },
  '6-stacks': { id: 'stacks-queues', defaultLabel: 'Stacks & Queues' },
  '7-binary-search': { id: 'binary-search', defaultLabel: 'Binary Search' },
  '8-linked-lists': { id: 'linked-lists', defaultLabel: 'Linked Lists' },
  '9-trees': { id: 'trees-bst', defaultLabel: 'Trees & BST' },
  '10-tries': { id: 'tries', defaultLabel: 'Tries' },
  '11-heaps-priority-queues': { id: 'heaps-priority-queues', defaultLabel: 'Heaps & Priority Queues' },
  '12-recursion-backtracking': { id: 'backtracking', defaultLabel: 'Backtracking' },
  '13-intervals': { id: 'intervals', defaultLabel: 'Intervals' },
  '14-greedy': { id: 'greedy', defaultLabel: 'Greedy' },
  '15-graphs': { id: 'graphs', defaultLabel: 'Graphs' },
  '16-1d-dp': { id: '1d-dp', defaultLabel: '1D Dynamic Programming' },
  '17-2d-dp': { id: '2d-dp', defaultLabel: '2D Dynamic Programming' },
  '18-bit-manipulation': { id: 'bit-manipulation', defaultLabel: 'Bit Manipulation' },
};

function generateStats() {
  if (!fs.existsSync(dsaDir)) {
    console.error(`DSA directory not found at: ${dsaDir}`);
    return;
  }

  const entries = fs.readdirSync(dsaDir, { withFileTypes: true });
  let totalProblems = 0;
  const topics = {};

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const meta = TOPIC_METADATA[entry.name] || {
      id: entry.name.replace(/^\d+-/, ''),
      defaultLabel: entry.name.replace(/^\d+-/, ''),
    };

    const folderPath = path.join(dsaDir, entry.name);
    const mdFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    const count = mdFiles.length;
    totalProblems += count;

    let label = meta.defaultLabel;
    const catJsonPath = path.join(folderPath, '_category_.json');
    if (fs.existsSync(catJsonPath)) {
      try {
        const raw = fs.readFileSync(catJsonPath, 'utf8').replace(/^\uFEFF/, '').trim();
        const catData = JSON.parse(raw);
        if (catData.label) label = catData.label;
      } catch (err) {
        // Fallback to defaultLabel
      }
    }

    topics[meta.id] = {
      folder: entry.name,
      label,
      count,
    };
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const stats = {
    totalProblems,
    topics,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outFile, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`[generate-dsa-stats] Generated ${outFile} (Total problems: ${totalProblems})`);
}

generateStats();
module.exports = generateStats;
