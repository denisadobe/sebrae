/*
 * Embed Iframe: variant of the block-collection embed for generic external pages
 * (e.g. marketing-cloud lead forms) rendered as a full-width iframe.
 * Authored as one row with a link to the page to embed. An optional second cell
 * with a number sets the iframe height in pixels. Video/social providers keep
 * the base embed's responsive 16:9 treatment.
 */

const DEFAULT_HEIGHT = 1000;

const embedYoutube = (url, autoplay) => {
  const usp = new URLSearchParams(url.search);
  const suffix = autoplay ? '&muted=1&autoplay=1' : '';
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }
  return `<div class="embed-iframe-ratio">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
      allowfullscreen="" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
};

const embedVimeo = (url, autoplay) => {
  const [, video] = url.pathname.split('/');
  const suffix = autoplay ? '?muted=1&autoplay=1' : '';
  return `<div class="embed-iframe-ratio">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}"
      allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
};

const getDefaultEmbed = (url, height) => `<div class="embed-iframe-frame" style="--embed-iframe-height: ${height}px">
    <iframe src="${url.href}" title="Content from ${url.hostname}" loading="lazy"
      allow="encrypted-media; clipboard-write"></iframe>
  </div>`;

const loadEmbed = (block, link, height, autoplay) => {
  if (block.classList.contains('embed-iframe-is-loaded')) return;

  const EMBEDS_CONFIG = [
    { match: ['youtube', 'youtu.be'], render: embedYoutube },
    { match: ['vimeo'], render: embedVimeo },
  ];
  let url;
  try {
    url = new URL(link);
  } catch (e) {
    return;
  }
  const config = EMBEDS_CONFIG.find((e) => e.match.some((match) => url.hostname.includes(match)));
  // keep the hidden authored source; replace only the placeholder
  const placeholder = block.querySelector('.embed-iframe-placeholder');
  if (placeholder) placeholder.remove();
  if (config) {
    block.insertAdjacentHTML('beforeend', config.render(url, autoplay));
    block.classList.add(`embed-iframe-${config.match[0].replace('.', '-')}`);
  } else {
    block.insertAdjacentHTML('beforeend', getDefaultEmbed(url, height));
  }
  block.classList.add('embed-iframe-is-loaded');
};

export default function decorate(block) {
  const anchor = block.querySelector('a');
  const link = anchor ? anchor.href : block.textContent.trim().split(/\s+/)[0];
  if (!link) return;

  // optional height cell: any cell whose text is just a number
  const heightCell = [...block.querySelectorAll(':scope > div > div')]
    .find((cell) => /^\d+(px)?$/.test(cell.textContent.trim()));
  const height = heightCell ? parseInt(heightCell.textContent, 10) : DEFAULT_HEIGHT;

  const placeholder = block.querySelector('picture');
  // keep the authored rows (hidden) so the editor's URL field stays instrumented
  const source = document.createElement('div');
  source.className = 'embed-iframe-source';
  source.hidden = true;
  source.append(...block.children);
  block.textContent = '';
  block.append(source);

  if (placeholder) {
    const wrapper = document.createElement('div');
    wrapper.className = 'embed-iframe-placeholder';
    wrapper.innerHTML = '<div class="embed-iframe-placeholder-play"><button type="button" title="Play"></button></div>';
    wrapper.prepend(placeholder);
    wrapper.addEventListener('click', () => loadEmbed(block, link, height, true));
    block.append(wrapper);
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        loadEmbed(block, link, height);
      }
    });
    observer.observe(block);
  }
}
