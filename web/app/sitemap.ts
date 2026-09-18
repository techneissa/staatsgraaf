import type { MetadataRoute } from "next";
import { getBudgetOrganizations } from "@/lib/budget";
import { getDatasetDate, getOrganizations, getPeople, getPositions } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { getTopics } from "@/lib/topics";

export const dynamic = "force-static";

function absolute(path: string): string {
  return SITE_URL ? `${SITE_URL}${path}` : path;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = getDatasetDate() ?? undefined;

  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: absolute(path),
    ...(lastModified !== undefined ? { lastModified } : {}),
    changeFrequency: "weekly",
    priority,
  });

  return [
    entry("/", 1),
    entry("/wijzigingen/", 0.9),
    entry("/onderwerpen/", 0.8),
    entry("/begroting/", 0.8),
    entry("/methodiek/", 0.3),
    entry("/privacy/", 0.3),
    entry("/toegankelijkheid/", 0.3),
    entry("/dataset/", 0.3),
    ...getTopics().map((topic) => entry(`/onderwerpen/${topic.slug}/`, 0.7)),
    ...getBudgetOrganizations().map((organization) =>
      entry(`/begroting/${organization.slug}/`, 0.6),
    ),
    ...getOrganizations().map((organization) => entry(`/organisaties/${organization.slug}/`, 0.6)),
    ...getPositions().map((position) => entry(`/posities/${position.slug}/`, 0.6)),
    ...getPeople().map((person) => entry(`/personen/${person.slug}/`, 0.5)),
  ];
}
