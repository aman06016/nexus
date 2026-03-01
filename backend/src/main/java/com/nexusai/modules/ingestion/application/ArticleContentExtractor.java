package com.nexusai.modules.ingestion.application;

import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.domain.ArticleStats;
import com.nexusai.modules.article.domain.SourceInfo;
import com.nexusai.modules.scrape.domain.RawArticleEvent;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ArticleContentExtractor {

    public Article extract(RawArticleEvent event, String canonicalUrl) {
        String title = event.discoveredTitle();
        String summary = "";
        String fullText = "";
        Instant publishedAt = event.discoveredAt() != null ? event.discoveredAt() : Instant.now();

        try {
            Document doc = Jsoup.connect(event.articleUrl())
                .timeout(20_000)
                .followRedirects(true)
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .get();

            if (doc.title() != null && !doc.title().isBlank()) {
                title = doc.title();
            }

            String description = doc.select("meta[property=og:description], meta[name=description]")
                .stream()
                .map(meta -> meta.attr("content"))
                .filter(content -> !content.isBlank())
                .findFirst()
                .orElse("");

            fullText = doc.body() != null ? doc.body().text() : "";
            summary = !description.isBlank() ? description : summarize(fullText);

            String publishedRaw = doc.select("meta[property=article:published_time], meta[name=published_time]")
                .stream()
                .map(meta -> meta.attr("content"))
                .filter(content -> !content.isBlank())
                .findFirst()
                .orElse(null);

            if (publishedRaw != null) {
                publishedAt = OffsetDateTime.parse(publishedRaw).toInstant();
            }
        } catch (Exception ex) {
            log.warn("Article content extraction fallback for url={} reason={}", event.articleUrl(), ex.getMessage());
            summary = summarize(event.discoveredTitle());
        }

        List<String> companies = detectCompanies(title + " " + summary);
        String category = detectCategory(title + " " + summary);
        double authorityScore = sourceAuthority(event.sourceDomain());
        int impactScore = computeImpact(title, summary, fullText, publishedAt, authorityScore, companies.size());

        return Article.builder()
            .url(event.articleUrl())
            .canonicalUrl(canonicalUrl)
            .urlHash(sha256(canonicalUrl))
            .title(title)
            .summary(summary)
            .fullText(fullText)
            .author(null)
            .publishedAt(publishedAt)
            .scrapedAt(Instant.now())
            .source(SourceInfo.builder()
                .name(event.sourceName())
                .domain(event.sourceDomain())
                .tier("TIER_1")
                .authorityScore(authorityScore)
                .build())
            .companies(companies)
            .tags(List.of())
            .category(category)
            .sentiment("NEUTRAL")
            .impactScore(impactScore)
            .thumbnail(null)
            .embedding(List.of())
            .stats(new ArticleStats())
            .status("PUBLISHED")
            .lang("en")
            .build();
    }

    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "Summary not available.";
        }

        String normalized = content.trim();
        return normalized.length() > 240 ? normalized.substring(0, 240) + "..." : normalized;
    }

    private List<String> detectCompanies(String text) {
        String input = text.toLowerCase(Locale.ROOT);
        List<String> known = List.of("openai", "anthropic", "google", "meta", "amazon", "mistral", "deepseek", "xai", "cohere");
        return known.stream().filter(input::contains).map(this::capitalize).toList();
    }

    private String detectCategory(String text) {
        String input = text.toLowerCase(Locale.ROOT);
        if (input.contains("funding") || input.contains("raised") || input.contains("series")) {
            return "Funding";
        }
        if (input.contains("model") || input.contains("release") || input.contains("llm")) {
            return "Model Release";
        }
        if (input.contains("open source")) {
            return "Open Source";
        }
        return "Research";
    }

    private int computeImpact(
        String title,
        String summary,
        String fullText,
        Instant publishedAt,
        double authorityScore,
        int companyHits
    ) {
        double relevance = relevanceSignal(title + " " + summary);
        double contentQuality = contentQualitySignal(title, fullText);
        double freshness = freshnessSignal(publishedAt);

        double score = 35 * authorityScore
            + relevance * 20
            + contentQuality * 20
            + freshness * 15
            + Math.min(companyHits * 2, 10);

        return Math.max(0, Math.min(100, (int) Math.round(score)));
    }

    private double sourceAuthority(String sourceDomain) {
        String domain = sourceDomain == null ? "" : sourceDomain.toLowerCase(Locale.ROOT);
        return switch (domain) {
            case "openai.com", "anthropic.com", "blog.google", "ai.meta.com" -> 1.0;
            case "aws.amazon.com", "venturebeat.com", "techcrunch.com" -> 0.92;
            case "wired.com", "theregister.com", "zdnet.com" -> 0.86;
            default -> 0.78;
        };
    }

    private double relevanceSignal(String text) {
        String input = text == null ? "" : text.toLowerCase(Locale.ROOT);
        List<String> highSignalTerms = List.of("ai", "artificial intelligence", "llm", "model", "inference", "training", "agent", "research");
        long matches = highSignalTerms.stream().filter(input::contains).count();
        return Math.min(matches / 4.0, 1.0);
    }

    private double contentQualitySignal(String title, String fullText) {
        int titleLength = title == null ? 0 : title.trim().length();
        int bodyLength = fullText == null ? 0 : fullText.trim().length();

        double titleScore = (titleLength >= 20 && titleLength <= 160) ? 1.0 : 0.5;
        double bodyScore = Math.min(bodyLength / 1800.0, 1.0);
        return (titleScore * 0.4) + (bodyScore * 0.6);
    }

    private double freshnessSignal(Instant publishedAt) {
        if (publishedAt == null) {
            return 0.4;
        }

        double ageHours = Math.max(Duration.between(publishedAt, Instant.now()).toMinutes(), 0) / 60.0;
        if (ageHours <= 1) {
            return 1.0;
        }
        if (ageHours <= 6) {
            return 0.8;
        }
        if (ageHours <= 24) {
            return 0.6;
        }
        if (ageHours <= 72) {
            return 0.4;
        }
        return 0.2;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash value", ex);
        }
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }
}
