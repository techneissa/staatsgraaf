import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsDayView, dayDescription } from "@/components/news/news-day-view";
import { getNewsDays } from "@/lib/news";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import { formatNewsDayLabel, newsPageMetadata } from "@/lib/news-page";

export const dynamic = "force-static";
export const dynamicParams = false;

const messages = NEWS_MESSAGES.en;

export function generateStaticParams() {
  return getNewsDays().map((day) => ({ date: day.date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  if (!getNewsDays().some((day) => day.date === date)) return {};
  const label = formatNewsDayLabel(date, "en");
  return newsPageMetadata({
    route: "en",
    title: `${messages.dayHeadingPrefix} ${label}`,
    description: dayDescription("en", label, false),
    path: `/news/${date}/`,
  });
}

export default async function NewsDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!getNewsDays().some((day) => day.date === date)) notFound();
  return <NewsDayView route="en" date={date} />;
}
