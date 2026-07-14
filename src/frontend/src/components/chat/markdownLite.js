import React from 'react';

/**
 * Tiny, dependency-free Markdown renderer for chat bot replies.
 * Supports: **bold**, *italic*, `code`, [links](url), bullet lists (-, *, •),
 * numbered lists (1.), and paragraph/line breaks. Output is plain React nodes
 * (no dangerouslySetInnerHTML), so it is safe from HTML injection.
 */

// Parse inline markup within a single line into an array of React nodes.
function renderInline(text, keyPrefix) {
  const nodes = [];
  // Order matters: links first, then bold, italic, code.
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-${i++}`;
    if (match[1]) {
      nodes.push(
        <a key={key} href={match[3]} target="_blank" rel="noopener noreferrer" className="text-[var(--secondary,#00d2fd)] underline">
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(<strong key={key} className="font-semibold text-white">{match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={key}>{match[7]}</em>);
    } else if (match[8]) {
      nodes.push(
        <code key={key} className="rounded bg-black/30 px-1 py-0.5 text-[0.82em] text-[var(--primary,#9fff88)]">
          {match[9]}
        </code>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export default function MarkdownLite({ text }) {
  const source = (text || '').replace(/\r\n/g, '\n');
  const lines = source.split('\n');

  const blocks = [];
  let listItems = null; // accumulate consecutive list lines
  let listOrdered = false;

  const flushList = (key) => {
    if (!listItems) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={key}
        className={`my-1 ${listOrdered ? 'list-decimal' : 'list-disc'} space-y-0.5 pl-5`}
      >
        {listItems.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${key}-${idx}`)}</li>
        ))}
      </Tag>
    );
    listItems = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (bulletMatch || orderedMatch) {
      const ordered = Boolean(orderedMatch);
      if (listItems && listOrdered !== ordered) flushList(`list-${idx}`);
      listOrdered = ordered;
      listItems = listItems || [];
      listItems.push((bulletMatch ? bulletMatch[1] : orderedMatch[1]).trim());
      return;
    }

    flushList(`list-${idx}`);

    if (line.trim() === '') {
      blocks.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="m-0">
        {renderInline(line, `p-${idx}`)}
      </p>
    );
  });

  flushList('list-end');

  return <div className="flex flex-col">{blocks}</div>;
}
