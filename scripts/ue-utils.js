/**
 * Moves the given attributes (default: all) from one element to another.
 * @param {Element} from the element to move attributes from
 * @param {Element} to the element to move attributes to
 * @param {string[]} [attributes] attribute names to move
 */
export function moveAttributes(from, to, attributes) {
  if (!from || !to) return;
  const names = attributes || [...from.attributes].map(({ nodeName }) => nodeName);
  names.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Moves Universal Editor instrumentation (data-aue-*, data-richtext-*) between elements,
 * so blocks that rebuild their DOM stay selectable and editable in the editor.
 * No-op outside the editor, where those attributes are absent.
 * @param {Element} from the element to move instrumentation from
 * @param {Element} to the element to move instrumentation to
 */
export function moveInstrumentation(from, to) {
  if (!from || !to) return;
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}
