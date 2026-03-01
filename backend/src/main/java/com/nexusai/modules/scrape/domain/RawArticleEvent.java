package com.nexusai.modules.scrape.domain;

import java.time.Instant;

public record RawArticleEvent(
    String sourceId,
    String sourceName,
    String sourceDomain,
    String sourceUrl,
    String articleUrl,
    String discoveredTitle,
    Instant discoveredAt
) {
}
