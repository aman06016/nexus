import { Article } from "@/lib/api/client";
import { getSourceTrust } from "@/lib/trust/sourceTrust";

export type WhyItMattersBrief = {
  whatHappened: string;
  whyNow: string;
  implication: string;
  confidence: number;
  generatedAt: string;
};

function cleanSentence(value?: string): string {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function firstSentence(value?: string): string {
  const cleaned = cleanSentence(value);
  if (!cleaned) {
    return "";
  }

  const match = cleaned.match(/(.+?[.!?])(\s|$)/);
  return match ? match[1].trim() : cleaned;
}

function timeSignal(article: Article): string {
  if (!article.publishedAt) {
    return "timing signal is still forming";
  }

  const publishedAt = new Date(article.publishedAt).getTime();
  if (!Number.isFinite(publishedAt)) {
    return "timing signal is still forming";
  }

  const hoursAgo = Math.max(0, Math.round((Date.now() - publishedAt) / (1000 * 60 * 60)));
  if (hoursAgo <= 6) {
    return "this surfaced in the last few hours";
  }
  if (hoursAgo <= 24) {
    return "this moved within the last day";
  }
  if (hoursAgo <= 72) {
    return "this remains active over multiple days";
  }
  return "this is a slower-burn signal with continued relevance";
}

function categoryImplication(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("policy")) {
    return "Expect compliance and governance roadmaps to shift as teams adapt to policy constraints.";
  }
  if (normalized.includes("research")) {
    return "This can change near-term product roadmaps as research moves from lab insight to shipped capability.";
  }
  if (normalized.includes("product") || normalized.includes("model")) {
    return "Competitive baselines may move quickly; teams should reassess build-vs-buy and release timing.";
  }
  return "Monitor second-order effects on vendor strategy, platform choices, and operating priorities.";
}

function confidenceScore(article: Article): number {
  const impact = article.impactScore ?? 0;
  const likes = article.stats?.likes ?? 0;
  const saves = article.stats?.saves ?? 0;
  const shares = article.stats?.shares ?? 0;
  const score = 45 + impact * 0.5 + likes * 0.8 + saves * 1.2 + shares * 1.1;
  return Math.max(40, Math.min(96, Math.round(score)));
}

export function generateWhyItMattersBrief(article: Article): WhyItMattersBrief {
  const title = cleanSentence(article.title) || "New development detected";
  const summaryLead = firstSentence(article.summary);
  const category = cleanSentence(article.category) || "AI";
  const sourceName = cleanSentence(article.source?.name) || "current source set";
  const sourceTrust = getSourceTrust(article.source?.domain);
  const impact = article.impactScore ?? 0;
  const engagement =
    (article.stats?.likes ?? 0) + (article.stats?.saves ?? 0) + (article.stats?.shares ?? 0);

  const whatHappened = summaryLead
    ? `${title}. ${summaryLead}`
    : `${title}. Initial signal indicates a noteworthy ${category.toLowerCase()} shift.`;

  const whyNow = `It matters now because ${timeSignal(article)}, with impact score ${impact} and engagement signal ${engagement}. Source confidence is ${sourceTrust.label.toLowerCase()} from ${sourceName}.`;

  const implication = `${categoryImplication(category)} Near-term action: decide whether this should change your monitoring priorities this week.`;

  return {
    whatHappened,
    whyNow,
    implication,
    confidence: confidenceScore(article),
    generatedAt: new Date().toISOString()
  };
}
