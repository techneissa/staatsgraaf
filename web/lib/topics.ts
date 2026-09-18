import { getDataset, getOrganizationById, getPositionById } from "./data";
import type { NewsItem, Organization, Position, Topic } from "./types";

export function getTopics(): Topic[] {
  return getDataset().topics;
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return getDataset().topics.find((topic) => topic.slug === slug);
}

export function getTopicById(id: string): Topic | undefined {
  return getDataset().topics.find((topic) => topic.id === id);
}

export function getResponsibleOrganizations(topic: Topic): Organization[] {
  return topic.organizations
    .map((id) => getOrganizationById(id))
    .filter((organization): organization is Organization => organization !== undefined);
}

export function getResponsiblePositions(topic: Topic): Position[] {
  return topic.positions
    .map((id) => getPositionById(id))
    .filter((position): position is Position => position !== undefined);
}

export function countResponsibleOrganizations(topic: Topic): number {
  return getResponsibleOrganizations(topic).length;
}

export const TOPIC_NEWS_LIMIT = 12;

function matchingTopicNews(topic: Topic): NewsItem[] {
  const organizationIds = new Set(topic.organizations);
  return getDataset()
    .news.filter(
      (item) =>
        item.topics.includes(topic.id) ||
        item.entities.some((id) => organizationIds.has(id)),
    )
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
}

export function getTopicNews(topic: Topic, limit: number = TOPIC_NEWS_LIMIT): NewsItem[] {
  return matchingTopicNews(topic).slice(0, limit);
}

export function countTopicNews(topic: Topic): number {
  return matchingTopicNews(topic).length;
}
