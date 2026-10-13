/**
 * Groups interview dialogue into speaker turns.
 *
 * The docs are authored as plain markdown paragraphs that open with
 * `**Interviewer:**` or `**Candidate:**`. CSS cannot select an element by its
 * text, so this rewrites each turn at build time into
 *
 *     <div className="csf-turn csf-turn--interviewer"> … </div>
 *
 * with the leading bold label replaced by a styled chip. A turn absorbs every
 * following block — paragraphs, lists, code, tables, blockquotes — until the
 * next speaker, heading or rule, so a multi-paragraph answer reads as one
 * answer rather than several loose blocks.
 *
 * Authoring is unchanged: keep writing `**Interviewer:**` in markdown.
 */

const SPEAKERS = {
  'Interviewer:': 'interviewer',
  'Candidate:': 'candidate',
};

/** Flatten a node's text content without pulling in mdast-util-to-string. */
function textOf(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) return node.children.map(textOf).join('');
  return '';
}

/** Returns 'interviewer' | 'candidate' | null for a paragraph that opens a turn. */
function speakerOf(node) {
  if (!node || node.type !== 'paragraph' || !Array.isArray(node.children)) return null;
  const first = node.children[0];
  if (!first || first.type !== 'strong') return null;
  return SPEAKERS[textOf(first).trim()] ?? null;
}

/** Swap the bold `**Interviewer:**` for a chip we can style. */
function replaceLabel(paragraph, speaker) {
  const label = speaker === 'interviewer' ? 'Interviewer' : 'Candidate';

  paragraph.children[0] = {
    type: 'mdxJsxTextElement',
    name: 'span',
    attributes: [
      {type: 'mdxJsxAttribute', name: 'className', value: 'csf-turn__who'},
    ],
    children: [{type: 'text', value: label}],
  };

  // The markdown leaves a space after the label; keep exactly one so the text
  // still copies cleanly, and let CSS own the visual gap.
  const next = paragraph.children[1];
  if (next && next.type === 'text') {
    next.value = next.value.replace(/^\s+/, ' ');
  }
}

/** A turn ends at the next speaker, or at any structural break. */
function endsTurn(node) {
  return (
    speakerOf(node) !== null ||
    node.type === 'heading' ||
    node.type === 'thematicBreak'
  );
}

function wrapTurns(parent) {
  if (!Array.isArray(parent.children)) return;

  const out = [];
  let i = 0;

  while (i < parent.children.length) {
    const node = parent.children[i];
    const speaker = speakerOf(node);

    if (!speaker) {
      out.push(node);
      i += 1;
      continue;
    }

    const turn = [node];
    i += 1;
    while (i < parent.children.length && !endsTurn(parent.children[i])) {
      turn.push(parent.children[i]);
      i += 1;
    }

    replaceLabel(turn[0], speaker);

    out.push({
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: `csf-turn csf-turn--${speaker}`,
        },
      ],
      children: turn,
    });
  }

  parent.children = out;
}

export default function remarkInterviewTurns() {
  return (tree) => {
    wrapTurns(tree);
  };
}
