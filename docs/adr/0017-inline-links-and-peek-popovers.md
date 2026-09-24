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
