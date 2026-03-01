package com.nexusai.modules.admin.application;

import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.source.application.SourceService;
import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.source.domain.SourceStatus;
import com.nexusai.modules.source.infrastructure.SourceRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class AdminOverviewService {

    private final ArticleRepository articleRepository;
    private final SourceRepository sourceRepository;
    private final SourceService sourceService;

    public Mono<AdminOverviewResponse> getOverview() {
        Mono<Long> totalArticlesMono = articleRepository.count();
        Mono<Long> publishedArticlesMono = articleRepository.countByStatus("PUBLISHED");
        Mono<Long> totalSourcesMono = sourceRepository.count();
        Mono<Long> activeSourcesMono = sourceRepository.countByStatus(SourceStatus.ACTIVE);
        Mono<Long> pausedSourcesMono = sourceRepository.countByStatus(SourceStatus.PAUSED);
        Mono<List<SourceSummary>> sourcesMono = sourceService.listSources()
            .map(this::toSummary)
            .collectList();

        return Mono.zip(
            totalArticlesMono,
            publishedArticlesMono,
            totalSourcesMono,
            activeSourcesMono,
            pausedSourcesMono,
            sourcesMono
        ).map(tuple -> new AdminOverviewResponse(
            Instant.now(),
            tuple.getT1(),
            tuple.getT2(),
            tuple.getT3(),
            tuple.getT4(),
            tuple.getT5(),
            tuple.getT6()
        ));
    }

    private SourceSummary toSummary(Source source) {
        return new SourceSummary(
            source.getId(),
            source.getName(),
            source.getDomain(),
            source.getTier(),
            source.getStatus() != null ? source.getStatus().name() : "UNKNOWN",
            source.getLastSuccess(),
            source.getSuccessRate(),
            source.getArticlesPerDay()
        );
    }

    public record AdminOverviewResponse(
        Instant timestamp,
        long totalArticles,
        long publishedArticles,
        long totalSources,
        long activeSources,
        long pausedSources,
        List<SourceSummary> sources
    ) {
    }

    public record SourceSummary(
        String id,
        String name,
        String domain,
        String tier,
        String status,
        Instant lastSuccess,
        Double successRate,
        Integer articlesPerDay
    ) {
    }
}
