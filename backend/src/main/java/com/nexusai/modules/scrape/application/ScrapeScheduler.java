package com.nexusai.modules.scrape.application;

import com.nexusai.modules.source.application.SourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapeScheduler {

    private final SourceService sourceService;

    @Scheduled(fixedDelayString = "${nexus.scrape.fixed-delay-ms}")
    public void scheduleHeartbeat() {
        sourceService.listActiveSources().count().subscribe(count ->
            log.info("Scrape scheduler heartbeat. Active sources={}", count)
        );
    }
}
