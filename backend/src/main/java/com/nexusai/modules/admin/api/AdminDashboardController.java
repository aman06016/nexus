package com.nexusai.modules.admin.api;

import com.nexusai.modules.admin.application.AdminOverviewService;
import com.nexusai.modules.scrape.application.ScrapeScheduler;
import com.nexusai.modules.trending.application.TrendingRecomputeService;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminOverviewService adminOverviewService;
    private final ScrapeScheduler scrapeScheduler;
    private final TrendingRecomputeService trendingRecomputeService;

    @GetMapping("/overview")
    public Mono<AdminOverviewService.AdminOverviewResponse> getOverview() {
        return adminOverviewService.getOverview();
    }

    @PostMapping("/scrape/run")
    public Mono<Map<String, Object>> runScrapeCycle() {
        return scrapeScheduler.runScrapeCycle()
            .map(activeSources -> Map.of(
                "triggeredAt", Instant.now().toString(),
                "activeSourcesProcessed", activeSources
            ));
    }

    @PostMapping("/trending/recompute")
    public Mono<Map<String, Object>> runTrendingRecompute() {
        return trendingRecomputeService.recomputeNow()
            .map(updatedArticles -> Map.of(
                "triggeredAt", Instant.now().toString(),
                "updatedArticles", updatedArticles
            ));
    }
}
