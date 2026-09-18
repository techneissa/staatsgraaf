# ADR 0003: Project name

Date: 2026-09-18
Status: accepted

## Context

`docs/01-vision-and-goals.md` section 9 carried a working name, "NL Overheid Graph", marked `(decide)`. The name determines the site title, the README headline, the logo lockup, and the domain. The reference product is CivLab's Gov Graph, so the project needs a Dutch name of its own rather than a translation.

## Decision

The public project name is **Staatsgraaf**. It replaces "NL Overheid Graph" everywhere the name is user facing: `web/lib/site.ts` (`SITE_NAME`), the README headline, the brand lockup, page titles, the footer, and the disclaimer. The English clarification "a source-backed graph of the Dutch state" stays available for the README and metadata.

## Consequences

Every use of the old working name is updated in the Wave 2 launch pass. The domain is bought under the chosen name. Internal identifiers, package names, and file paths do not need to change; they never carried the display name except in `site.ts`, which is the single source of truth for the display string.
