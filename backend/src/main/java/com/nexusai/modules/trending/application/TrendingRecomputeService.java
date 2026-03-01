package com.nexusai.modules.trending.application;

import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.domain.ArticleStats;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendingRecomputeService {

    private final ArticleRepository articleRepository;

    @Scheduled(fixedDelayString = "${nexus.trending.recompute-delay-ms}")
    public void recomputeTrendingScores() {
        recomputeNow()
            .subscribe(updated -> log.info("Trending recompute finished. updatedArticles={}", updated));
    }

    public Mono<Long> recomputeNow() {
        return articleRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED", PageRequest.of(0, 300))
            .collectList()
            .flatMapMany(articles -> {
                Instant now = Instant.now();
                return reactor.core.publisher.Flux.fromIterable(articles)
                    .concatMap(article -> {
                        int newScore = computeTrendScore(article, articles, now);
                        Integer oldScore = article.getImpactScore();
                        if (oldScore != null && oldScore == newScore) {
                            return reactor.core.publisher.Mono.empty();
                        }

                        article.setImpactScore(newScore);
                        return articleRepository.save(article);
                    });
            })
            .count();
    }

    private int computeTrendScore(Article article, List<Article> recent, Instant now) {
        ArticleStats stats = article.getStats() == null ? new ArticleStats() : article.getStats();

        double likes = stats.getLikes();
        double views = stats.getViews();
        double saves = stats.getSaves();
        double shares = stats.getShares();

        double engagement = likes * 3 + views + saves * 5 + shares * 4;
        double engagementBase = Math.max(engagement, 8);

        double ageHours = 0;
        if (article.getPublishedAt() != null) {
            ageHours = Math.max(Duration.between(article.getPublishedAt(), now).toMinutes(), 0) / 60.0;
        }

        double decayFactor = Math.exp(-Math.log(2) * (ageHours / 6.0));
        double authority = article.getSource() != null && article.getSource().getAuthorityScore() > 0
            ? article.getSource().getAuthorityScore()
            : 1.0;

        double novelty = noveltyBonus(article, recent);
        double raw = engagementBase * decayFactor * authority * novelty;

        double stabilized = Math.log1p(raw) * 24;
        double recencyBoost = Math.max(0, 12 - ageHours) * 1.5;
        int score = (int) Math.round(stabilized + recencyBoost);
        return Math.max(0, Math.min(100, score));
    }

    private double noveltyBonus(Article article, List<Article> recent) {
        String currentTitle = article.getTitle();
        if (currentTitle == null || currentTitle.isBlank()) {
            return 1.0;
        }

        Set<String> tokens = tokenize(currentTitle);
        if (tokens.isEmpty()) {
            return 1.0;
        }

        double maxSimilarity = 0;
        for (Article other : recent) {
            if (article.getId() != null && article.getId().equals(other.getId())) {
                continue;
            }

            if (other.getTitle() == null || other.getTitle().isBlank()) {
                continue;
            }

            Set<String> otherTokens = tokenize(other.getTitle());
            if (otherTokens.isEmpty()) {
                continue;
            }

            maxSimilarity = Math.max(maxSimilarity, jaccard(tokens, otherTokens));
        }

        double noveltyWeight = 1.0 + (1.0 - maxSimilarity) * 0.2;
        return Math.max(1.0, Math.min(1.2, noveltyWeight));
    }

    private Set<String> tokenize(String text) {
        Set<String> tokens = new HashSet<>();
        Arrays.stream(text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
            .filter(token -> token.length() >= 3)
            .forEach(tokens::add);
        return tokens;
    }

    private double jaccard(Set<String> a, Set<String> b) {
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        if (union.isEmpty()) {
            return 0;
        }

        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        return (double) intersection.size() / union.size();
    }
}
