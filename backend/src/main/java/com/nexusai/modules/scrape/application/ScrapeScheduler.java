package com.nexusai.modules.scrape.application;

import com.nexusai.modules.source.application.SourceService;
import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.scrape.infrastructure.ScrapeEventPublisher;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapeScheduler {

    private final SourceService sourceService;
    private final SourceScrapeWorker sourceScrapeWorker;
    private final ScrapeEventPublisher scrapeEventPublisher;

    @Scheduled(fixedDelayString = "${nexus.scrape.fixed-delay-ms}")
    public void scheduleScrapeCycle() {
        runScrapeCycle()
            .subscribe(activeSources -> {
                if (activeSources == 0) {
                    log.info("Scrape cycle skipped: no active sources");
                    return;
                }
                log.info("Scrape cycle completed. Active sources={}", activeSources);
            });
    }

    public Mono<Integer> runScrapeCycle() {
        return sourceService.listActiveSources()
            .collectList()
            .map(activeSources -> {
                if (activeSources.isEmpty()) {
                    return 0;
                }

                for (Source source : activeSources) {
                    List<com.nexusai.modules.scrape.domain.RawArticleEvent> events = sourceScrapeWorker.scrape(source);
                    events.forEach(scrapeEventPublisher::publish);
                    sourceService.markSuccess(source.getId()).subscribe();
                }

                return activeSources.size();
            });
    }
}
