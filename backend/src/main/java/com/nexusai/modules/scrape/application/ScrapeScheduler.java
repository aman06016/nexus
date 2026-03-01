package com.nexusai.modules.scrape.application;

import com.nexusai.modules.source.application.SourceService;
import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.scrape.infrastructure.ScrapeEventPublisher;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapeScheduler {

    private final SourceService sourceService;
    private final SourceScrapeWorker sourceScrapeWorker;
    private final ScrapeEventPublisher scrapeEventPublisher;

    @Scheduled(fixedDelayString = "${nexus.scrape.fixed-delay-ms}")
    public void scheduleScrapeCycle() {
        List<Source> activeSources = sourceService.listActiveSources().collectList().block();
        if (activeSources == null || activeSources.isEmpty()) {
            log.info("Scrape cycle skipped: no active sources");
            return;
        }

        for (Source source : activeSources) {
            sourceScrapeWorker.scrape(source).forEach(scrapeEventPublisher::publish);
            sourceService.markSuccess(source.getId()).subscribe();
        }

        log.info("Scrape cycle completed. Active sources={}", activeSources.size());
    }
}
