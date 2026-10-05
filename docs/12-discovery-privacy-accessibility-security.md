# Discovery, privacy, accessibility, and security

Four concerns that a public reference product must get right and that are easy to defer until it is too late. Read this with `09-content-and-ai-policy.md` (what ships) and `06-build-plan.md` (the stack these apply to).

## Part 1. Discoverability (SEO and sharing)

The product is a reference. It should be findable for exactly the queries it answers, and it should look right when shared.

### Per-page metadata

- A unique title and a meta description derived from the entity, position, person, or topic. Not a template with the name pasted in; a real sentence.
- A canonical URL on every page.
- Open Graph and Twitter card tags with a title, a description, and an image (the entity portrait or a generated card).
- The dataset snapshot date in the metadata, so a cached search result is not mistaken for current.

### Structured data

Emit JSON-LD on the relevant pages, because search engines and future tools consume it:

- `GovernmentOrganization` for a ministerie, provincie, gemeente, waterschap, ZBO, or court, with `parentOrganization` where it applies.
- `Person` for a person page, with `jobTitle` and the organizations.
- `NewsArticle` for an article card where a syndication policy allows it.
- `WebSite` with a search action on the homepage.

### Indexability

- The reference has no sitemap. We do. Generate `sitemap.xml` from the route set, with a last-modified date per page from the dataset.
- A correct `robots.txt`. The reference's is written for a site that crawls sources; ours points crawlers at the sitemap and the open dataset.
- Server-render or statically render the facts. The graph is a client component; the facts on the page are not, so a crawler that runs no JavaScript still reads them.

### Sharing and citation

- A "cite this" note on entity and person pages with the dataset version and a suggested citation.
- A stable URL per entity, person, and position, so a link keeps working. Slug changes get a redirect, per `04-data-model.md` section 16.

### Internal linking

- Every entity page links to its parent, its head, its members, and its connections. This is the product's value and it is also good for discovery.

### Future English UI

- When the English UI ships, use `hreflang` between the Dutch and English pages. Keep the entity slug identical across languages so a shared link resolves.

## Part 2. Analytics and privacy

### Analytics

- Use privacy-first, cookieless analytics (for example Plausible or a self-hosted equivalent) `(decide)`. No third-party advertising trackers, ever.
- Measure page views and outbound source clicks, not individuals.
- State what is measured in the privacy statement.

### GDPR and personal data

- The dataset covers people in a public function only, and only facts the government itself publishes. This is the lawful basis: a task carried out in the public interest and the data is already public.
- No contact details, no private addresses, no family data, no birth dates unless officially published and useful.
- Data minimization: if a field is not needed to explain the structure of government, it is not collected.
- People pages: a correction and removal path. A person can request a correction of a factual error, and we fix it with a changelog entry. A request to remove a public-function fact is assessed against the public-interest basis and the right to object.
- Deceased and historical figures are handled with the same care and the same sourcing.
- A privacy statement page states the basis, the scope, the retention, and the correction path, in Dutch.
- Retention: the dataset history and the dated raw snapshots are kept to re-derive published states. State the retention period in the privacy statement.

### Licensing and attribution

- Display the data license and the source attribution in the footer and on the data download.
- Display the image credit and license next to every portrait, from `media.json`.

## Part 3. Accessibility

### Target

- WCAG 2.2 level AA `(decide)`, for the site and for the Swift app on the platform's accessibility features.

### Requirements

- Full keyboard reachability, with a visible focus ring, in this order: top bar, left column, then the canvas. The canvas must be reachable and operable, not skipped.
- A semantically correct document: one `h1`, ordered headings, landmarks (`header`, `nav`, `main`, `aside`, `footer`).
- The graph has an accessible alternative: a structured list of nodes, edges, and the current selection, so a screen reader user gets the same information as a sighted user.
- Search is a proper combobox: label, expanded state, and announced results. The two-input duplicate in the reference is avoided; ship one search input per breakpoint with one accessible name.
- Contrast passes in both themes. The dark canvas is the hard case; the labels and node outlines must meet the minimum against the near-black background.
- Respect `prefers-reduced-motion`. The reference's transitions are decorative and can be removed.
- Text can scale to 200 percent without loss of function.
- An accessibility statement page with the conformance level and a contact for issues.

### Testing

- Automated checks (axe or equivalent) in CI on the main routes.
- A manual keyboard and screen-reader pass on the homepage, one entity page, one person page, and the graph, at the QA gate in `08-acceptance-and-qa.md` section 6.

## Part 4. Security

The product is static, which keeps the surface small. The remaining risks are the pipeline, the sources, and the injected markup.

### The site

- HTTPS with HSTS. A strict Content Security Policy, since the site serves static assets and no inline scripts beyond what the framework needs.
- External links use `rel="noopener"`. Source links open in a new tab only when useful.
- No secret is ever shipped to the client.

### Injected content

- News summaries and descriptions are rendered from our own markup, not from raw source HTML. The entity tag in `04-data-model.md` is parsed and rendered as elements, never as HTML, so a hostile source cannot inject script.
- Sanitize any string that originates outside the pipeline before it reaches the DOM.

### The pipeline and the supply chain

- Commit the lockfile. Review dependency updates. Use automated dependency alerts.
- Only the CI job holds source API keys, per `.github/workflows/README.md` (secrets and variables).
- Pin fetchers to the domains in the source map in `03-dutch-government-model.md`, so a redirect cannot silently point a fetcher elsewhere.
- Treat every fetched payload as untrusted input: validate it against the expected shape before it enters the dataset.

### Reporting

- A `SECURITY.md` describes how to report a vulnerability and what is in scope (the site, the app, the pipeline, and the published data integrity).
- A wrong fact is a data-correctness issue, not a security issue; it follows the correction path in `09-content-and-ai-policy.md` section 8.

## Part 5. Browser and device support

- Evergreen browsers: the current and previous major of Chrome, Edge, Firefox, and Safari, on desktop and mobile.
- The site works without JavaScript for reading facts; the graph and search need JavaScript and say so gracefully if it is off.
- The layout is usable from small mobile up to a large desktop. The two-column spine collapses on mobile: the editorial column first, the canvas below or behind a control.
- The Swift app targets the current iOS and the previous major `(decide)`.
