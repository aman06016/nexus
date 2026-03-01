type TrustTone = "high" | "medium" | "baseline";

export type SourceTrust = {
  label: string;
  tone: TrustTone;
  rationale: string;
};

const PRIMARY_DOMAINS = new Set([
  "openai.com",
  "anthropic.com",
  "deepmind.google",
  "ai.googleblog.com",
  "microsoft.com",
  "meta.com",
  "nvidia.com",
  "aws.amazon.com",
  "arxiv.org"
]);

const ESTABLISHED_DOMAINS = new Set([
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "venturebeat.com",
  "github.blog",
  "bloomberg.com",
  "reuters.com"
]);

function normalizeDomain(domain?: string | null): string {
  if (!domain) {
    return "";
  }

  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function includesDomain(candidates: Set<string>, domain: string): boolean {
  for (const known of candidates) {
    if (domain === known || domain.endsWith(`.${known}`)) {
      return true;
    }
  }
  return false;
}

export function getSourceTrust(domain?: string | null): SourceTrust {
  const normalizedDomain = normalizeDomain(domain);

  if (normalizedDomain && includesDomain(PRIMARY_DOMAINS, normalizedDomain)) {
    return {
      label: "Primary Source",
      tone: "high",
      rationale: "First-party publication or original research source."
    };
  }

  if (normalizedDomain && includesDomain(ESTABLISHED_DOMAINS, normalizedDomain)) {
    return {
      label: "Established Coverage",
      tone: "medium",
      rationale: "Recognized outlet with consistent AI reporting."
    };
  }

  return {
    label: "Broad Coverage",
    tone: "baseline",
    rationale: "Included for breadth; validate with multiple sources when critical."
  };
}
