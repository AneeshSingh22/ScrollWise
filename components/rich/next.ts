/**
 * Moves the feed to the card after (or before) the one containing `el`.
 * Used by "Next" buttons and by the swipe fallback for cards whose content
 * scrolls, where iOS often won't hand the swipe on to the feed.
 */
export function goToSibling(el: Element | null, dir: 1 | -1 = 1) {
  const card = el?.closest(".card");
  const target = dir === 1 ? card?.nextElementSibling : card?.previousElementSibling;
  if (target instanceof HTMLElement) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
