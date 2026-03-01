package com.nexusai.modules.scrape.application;

import com.nexusai.modules.scrape.domain.RawArticleEvent;
import com.nexusai.modules.scrape.infrastructure.JsoupSourcePageFetcher;
import com.nexusai.modules.scrape.infrastructure.PlaywrightSourcePageFetcher;
import com.nexusai.modules.source.domain.Source;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class SourceScrapeWorker {

    private final JsoupSourcePageFetcher jsoupFetcher;
    private final PlaywrightSourcePageFetcher playwrightFetcher;
    private final int minContentLengthForJsoup;
    private final int maxLinksPerSource;
    private final boolean playwrightEnabled;

    public SourceScrapeWorker(
        JsoupSourcePageFetcher jsoupFetcher,
        PlaywrightSourcePageFetcher playwrightFetcher,
        @Value("${nexus.scrape.min-content-length-for-jsoup}") int minContentLengthForJsoup,
        @Value("${nexus.scrape.max-links-per-source}") int maxLinksPerSource,
        @Value("${nexus.scrape.playwright-enabled}") boolean playwrightEnabled
    ) {
        this.jsoupFetcher = jsoupFetcher;
        this.playwrightFetcher = playwrightFetcher;
        this.minContentLengthForJsoup = minContentLengthForJsoup;
        this.maxLinksPerSource = maxLinksPerSource;
        this.playwrightEnabled = playwrightEnabled;
    }

    public List<RawArticleEvent> scrape(Source source) {
        Optional<PageSnapshot> snapshot = primaryFetch(source);

        if (snapshot.isEmpty() || snapshot.get().html().length() < minContentLengthForJsoup) {
            snapshot = fallbackFetch(source);
        }

        if (snapshot.isEmpty()) {
            return List.of();
        }

        List<RawArticleEvent> events = extractLinks(source, snapshot.get());
        log.info("Scraped source={} discoveredLinks={}", source.getName(), events.size());
        return events;
    }

    private Optional<PageSnapshot> primaryFetch(Source source) {
        String mode = source.getScrapeConfig() != null ? source.getScrapeConfig().getMode() : "JSOUP";
        if ("PLAYWRIGHT".equalsIgnoreCase(mode)) {
            return playwrightFetcher.fetch(source);
        }
        return jsoupFetcher.fetch(source);
    }

    private Optional<PageSnapshot> fallbackFetch(Source source) {
        if (!playwrightEnabled) {
            return Optional.empty();
        }

        String mode = source.getScrapeConfig() != null ? source.getScrapeConfig().getMode() : "JSOUP";
        if ("PLAYWRIGHT".equalsIgnoreCase(mode)) {
            return jsoupFetcher.fetch(source);
        }
        return playwrightFetcher.fetch(source);
    }

    private List<RawArticleEvent> extractLinks(Source source, PageSnapshot snapshot) {
        Document document = Jsoup.parse(snapshot.html(), snapshot.resolvedUrl());

        Set<String> uniqueLinks = new LinkedHashSet<>();
        List<RawArticleEvent> events = new ArrayList<>();

        for (Element element : document.select("a[href]")) {
            String link = element.absUrl("href").trim();
            if (!isCandidate(link, source)) {
                continue;
            }

            if (!uniqueLinks.add(link)) {
                continue;
            }

            String discoveredTitle = element.text().trim();
            if (discoveredTitle.isEmpty()) {
                discoveredTitle = "Untitled";
            }
            if (isLowSignalAnchor(discoveredTitle)) {
                continue;
            }

            events.add(new RawArticleEvent(
                source.getId(),
                source.getName(),
                source.getDomain(),
                source.getScrapeConfig().getUrl(),
                link,
                discoveredTitle,
                Instant.now()
            ));

            if (events.size() >= maxLinksPerSource) {
                break;
            }
        }

        return events;
    }

    private boolean isCandidate(String link, Source source) {
        if (link.isBlank()) {
            return false;
        }

        URI linkUri;
        URI sourceUri;
        try {
            linkUri = URI.create(link);
            sourceUri = URI.create(source.getScrapeConfig().getUrl());
        } catch (Exception ex) {
            return false;
        }

        String linkHost = linkUri.getHost();
        String sourceHost = sourceUri.getHost();
        if (linkHost == null || sourceHost == null) {
            return false;
        }

        String lower = link.toLowerCase(Locale.ROOT);
        if (!(lower.startsWith("http://") || lower.startsWith("https://"))) {
            return false;
        }

        if (!isSameHostScope(linkHost, sourceHost, source.getDomain())) {
            return false;
        }

        if (isNonEditorialPath(linkUri.getPath())) {
            return false;
        }

        if (lower.contains("/tag/") || lower.contains("/category/") || lower.contains("javascript:")) {
            return false;
        }

        if (lower.contains("twitter.com/intent")
            || lower.contains("x.com/intent")
            || lower.contains("facebook.com/sharer")
            || lower.contains("linkedin.com/sharearticle")
            || lower.contains("mailto:")
            || lower.contains("/press-kit")) {
            return false;
        }

        String query = linkUri.getQuery();
        if (query != null && query.split("&").length > 6) {
            return false;
        }

        return !lower.equalsIgnoreCase(source.getScrapeConfig().getUrl());
    }

    private boolean isSameHostScope(String linkHost, String sourceHost, String sourceDomain) {
        String normalizedLinkHost = linkHost.toLowerCase(Locale.ROOT);
        String normalizedSourceHost = sourceHost.toLowerCase(Locale.ROOT);
        String normalizedDomain = sourceDomain == null ? normalizedSourceHost : sourceDomain.toLowerCase(Locale.ROOT);

        return normalizedLinkHost.equals(normalizedSourceHost)
            || normalizedLinkHost.endsWith("." + normalizedSourceHost)
            || normalizedLinkHost.equals(normalizedDomain)
            || normalizedLinkHost.endsWith("." + normalizedDomain);
    }

    private boolean isNonEditorialPath(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) {
            return true;
        }

        String normalized = path.toLowerCase(Locale.ROOT);
        if (normalized.matches(".*\\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4)$")) {
            return true;
        }

        String[] segments = Arrays.stream(normalized.split("/"))
            .filter(segment -> !segment.isBlank())
            .toArray(String[]::new);
        if (segments.length < 2) {
            return true;
        }

        return normalized.contains("/privacy")
            || normalized.contains("/terms")
            || normalized.contains("/cookie")
            || normalized.contains("/about")
            || normalized.contains("/contact")
            || normalized.contains("/careers")
            || normalized.contains("/login")
            || normalized.contains("/signup")
            || normalized.contains("/press-kit");
    }

    private boolean isLowSignalAnchor(String text) {
        String normalized = text.toLowerCase(Locale.ROOT).trim();
        if (normalized.length() < 12) {
            return true;
        }

        return normalized.equals("home")
            || normalized.equals("news")
            || normalized.equals("research")
            || normalized.equals("read more")
            || normalized.equals("learn more")
            || normalized.equals("skip to main content");
    }
}
