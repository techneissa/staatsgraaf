# ADR 0017: inline entity links with peek popovers

- Date: 24-09-2026
- Status: accepted. The owner asked on 24-09-2026 for mentioned entities to read as links instead of bubbles, and for a click to open a popover with a button to the full page instead of navigating every time.

## Context

News cards, connection lists, and change rows linked every mentioned organisation, person, position, and topic as a bordered pill. On an iPhone a card with two or three mentions wrapped into large bubbles that pushed the source out of view, and every click left the page. Readers who want to know who someone is lost their place in the list.

## Decision

1. **Links, not pills.** A mentioned entity is an inline text link, coloured by kind (person, organisation, position, topic, place) with a small kind mark. Pills stay only for filters and controls.
2. **Peek on click.** A plain click or Enter on an internal entity link opens a peek: name, kind, portrait or initials, role, party, or parent body, a short description where the dataset has one, a few key facts, and the source. An "Open pagina" or "Open page" button goes to the full page. A modified click (cmd, ctrl, shift, middle button) still follows the link, and every link keeps its `href`, so the site works without JavaScript.
3. **Form.** On a phone the peek is a bottom sheet with safe-area padding. On a tablet or desktop it is an anchored popover that flips to stay on screen. It is a dialog with a label; Escape, an outside click, or the close button closes it and returns focus to the link.
4. **Data.** The peek reads a compact index generated at build time from the dataset and served from the same origin, loaded lazily in shards so the first page stays light. It carries only fields already published on the entity pages, with their sources. No third-party fetch.

## Consequences

- Readers can check who or what is meant without leaving a list, and the full page is one tap away.
- The build gains one generated artifact. It is derived from `data/` like `graph.json` and the search index, so it cannot drift from the pages.
- A future Swift client can read the same peek shards.

## Amendment 05-10-2026: index lists navigate

Index lists (people, organisations, positions, parties, topics) go straight to the page on click. The peek popover stays for mentions in running text, news cards and tables. A list exists to navigate, and the extra peek step doubled the clicks per person. The index cards carry no `data-peek`, and `PeekLink` and `EntityPeekLink` take a `peek={false}` prop for this. Peek shards are prefetched on hover, focus, pointerdown and touchstart, and on touch also when a link enters the viewport.

## Amendment 14-10-2026: peek layout and landscape phones

Facts in the peek stack (label above value). A 7 rem two-column grid left short values floating in the middle of a 22 rem popover and a phone sheet, and the 44 px tap min-size on inline links stretched those rows on a coarse pointer. Holder titles wrap. A phone on its side is wider than 639 px, so the sheet query is `(max-width: 639px), ((pointer: coarse) and (max-height: 639px))` and still matches a landscape phone. The close button sits on the heading, not beside the whole card.

## Amendment 14-10-2026: peek size and part-of

A peek whose content fits in 90 % of the viewport sizes to that content and does not scroll. Only a taller peek uses the 60 % detent, a handle, and an inner scroller. "Part of" / "Onderdeel van" puts the parent name on the same line as the label; other facts still stack.
