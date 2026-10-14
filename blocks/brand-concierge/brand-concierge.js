/*
 * Brand Concierge (full page): mounts the Adobe Brand Concierge chat inline, in a tall panel.
 * Authoring: the block needs no content (put an intro as default content above it).
 * A page with this block does not show the floating popup.
 */
import { mountConcierge } from '../../scripts/brand-concierge.js';

export default async function decorate(block) {
  // authored rows stay in the DOM (hidden) so the block keeps its Universal Editor instrumentation
  const source = document.createElement('div');
  source.className = 'brand-concierge-source';
  source.append(...block.children);
  source.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'brand-concierge-panel';
  block.replaceChildren(panel, source);

  await mountConcierge(panel);

  // continuing a conversation (e.g. expanded from the popup): bring the whole chat into view
  const hasTranscript = Object.keys(localStorage).some((k) => k.startsWith('bc_chat_transcript_'));
  if (hasTranscript) setTimeout(() => block.scrollIntoView({ block: 'start' }), 600);
}
