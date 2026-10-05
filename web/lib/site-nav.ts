/**
 * The sections of the site, in the order the top bar, the mobile menu and the
 * 404 page list them. `label` is a key in the common dictionary.
 */
export const SECTIONS = [
  { href: "/wijzigingen/", label: "navChanges" },
  { href: "/nieuws/", label: "navNews" },
  { href: "/onderwerpen/", label: "navTopics" },
  { href: "/begroting/", label: "navBudget" },
  { href: "/organisaties/", label: "navOrganizations" },
  { href: "/personen/", label: "navPeople" },
  { href: "/partijen/", label: "navParties" },
  { href: "/posities/", label: "navPositions" },
] as const;

/** The page that explains the site, its method and its sources. */
export const ABOUT = { href: "/methodiek/", label: "navAbout" } as const;

/** The sections plus the About page, as the desktop top bar lists them. */
export const MAIN_NAV = [...SECTIONS, ABOUT] as const;
