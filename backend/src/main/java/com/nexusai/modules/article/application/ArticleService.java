package com.nexusai.modules.article.application;

import com.nexusai.common.domain.ResourceNotFoundException;
import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import com.nexusai.modules.interaction.infrastructure.InteractionRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;
    private final InteractionRepository interactionRepository;
    private final ArticleQualityFilter articleQualityFilter;

    public Flux<Article> getLatest(int page, int limit) {
        return articleRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED", PageRequest.of(page, limit))
            .filter(articleQualityFilter::isDisplayable);
    }

    public Flux<Article> getTrending(int page, int limit) {
        return articleRepository.findByStatusOrderByImpactScoreDescPublishedAtDesc("PUBLISHED", PageRequest.of(page, limit))
            .filter(articleQualityFilter::isDisplayable);
    }

    public Mono<Article> getById(String id) {
        return articleRepository.findById(id)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Article not found: " + id)));
    }

    public Flux<Article> getSavedBySession(String sessionId, int page, int limit) {
        long skip = (long) page * limit;
        return interactionRepository.findBySessionIdAndTypeOrderByTimestampDesc(sessionId, InteractionType.SAVE)
            .skip(skip)
            .take(limit)
            .map(interaction -> interaction.getArticleId())
            .collectList()
            .flatMapMany(this::loadArticlesInOrder);
    }

    public Flux<Article> getPersonalizedFeed(String sessionId, int page, int limit) {
        if (sessionId == null || sessionId.isBlank()) {
            return getLatest(page, limit);
        }

        List<InteractionType> consideredTypes = List.of(
            InteractionType.SAVE,
            InteractionType.LIKE,
            InteractionType.CLICK,
            InteractionType.VIEW
        );

        return interactionRepository.findBySessionIdAndTypeInOrderByTimestampDesc(sessionId, consideredTypes)
            .take(300)
            .collectList()
            .flatMapMany(interactions -> {
                if (interactions.isEmpty()) {
                    return getLatest(page, limit);
                }

                Map<String, Integer> articleWeightMap = buildInteractionWeightMap(interactions);
                Set<String> interactedArticleIds = new HashSet<>(articleWeightMap.keySet());

                return articleRepository.findByIdIn(interactedArticleIds)
                    .collectList()
                    .flatMapMany(history -> {
                        Map<String, Integer> companyWeights = new HashMap<>();
                        Map<String, Integer> categoryWeights = new HashMap<>();
                        buildPreferenceWeights(history, articleWeightMap, companyWeights, categoryWeights);

                        return articleRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED", PageRequest.of(0, 300))
                            .collectList()
                            .flatMapMany(candidates -> rankPersonalized(candidates, interactedArticleIds, companyWeights, categoryWeights, page, limit));
                    });
            });
    }

    private Flux<Article> loadArticlesInOrder(List<String> articleIds) {
        if (articleIds.isEmpty()) {
            return Flux.empty();
        }

        return Flux.fromIterable(articleIds)
            .concatMap(articleRepository::findById)
            .filter(articleQualityFilter::isDisplayable);
    }

    private Map<String, Integer> buildInteractionWeightMap(List<Interaction> interactions) {
        Map<InteractionType, Integer> typeWeights = new EnumMap<>(InteractionType.class);
        typeWeights.put(InteractionType.SAVE, 7);
        typeWeights.put(InteractionType.LIKE, 5);
        typeWeights.put(InteractionType.CLICK, 3);
        typeWeights.put(InteractionType.VIEW, 2);

        Map<String, Integer> articleWeightMap = new HashMap<>();
        for (Interaction interaction : interactions) {
            int delta = typeWeights.getOrDefault(interaction.getType(), 1);
            articleWeightMap.merge(interaction.getArticleId(), delta, Math::max);
        }

        return articleWeightMap;
    }

    private void buildPreferenceWeights(
        List<Article> history,
        Map<String, Integer> articleWeightMap,
        Map<String, Integer> companyWeights,
        Map<String, Integer> categoryWeights
    ) {
        for (Article article : history) {
            int articleWeight = articleWeightMap.getOrDefault(article.getId(), 1);
            if (article.getCompanies() != null) {
                for (String company : article.getCompanies()) {
                    companyWeights.merge(company.toLowerCase(), articleWeight, Integer::sum);
                }
            }

            if (article.getCategory() != null && !article.getCategory().isBlank()) {
                categoryWeights.merge(article.getCategory().toLowerCase(), articleWeight, Integer::sum);
            }
        }
    }

    private Flux<Article> rankPersonalized(
        List<Article> candidates,
        Set<String> interactedArticleIds,
        Map<String, Integer> companyWeights,
        Map<String, Integer> categoryWeights,
        int page,
        int limit
    ) {
        candidates = new ArrayList<>(
            candidates.stream()
                .filter(articleQualityFilter::isDisplayable)
                .toList()
        );

        Instant now = Instant.now();
        candidates.sort(Comparator.comparingDouble(
            article -> -personalizedScore(article, interactedArticleIds, companyWeights, categoryWeights, now)
        ));

        int fromIndex = Math.min(Math.max(page, 0) * Math.max(limit, 1), candidates.size());
        int toIndex = Math.min(fromIndex + Math.max(limit, 1), candidates.size());
        if (fromIndex >= toIndex) {
            return Flux.empty();
        }

        return Flux.fromIterable(candidates.subList(fromIndex, toIndex));
    }

    private double personalizedScore(
        Article article,
        Set<String> interactedArticleIds,
        Map<String, Integer> companyWeights,
        Map<String, Integer> categoryWeights,
        Instant now
    ) {
        double score = article.getImpactScore() != null ? article.getImpactScore() : 0;
        if (article.getCompanies() != null) {
            for (String company : article.getCompanies()) {
                score += companyWeights.getOrDefault(company.toLowerCase(), 0) * 2.5;
            }
        }

        if (article.getCategory() != null) {
            score += categoryWeights.getOrDefault(article.getCategory().toLowerCase(), 0) * 1.8;
        }

        if (article.getPublishedAt() != null) {
            double ageHours = Math.max(Duration.between(article.getPublishedAt(), now).toMinutes(), 0) / 60.0;
            score += Math.max(0, 24 - ageHours) * 0.6;
        }

        if (interactedArticleIds.contains(article.getId())) {
            score -= 20;
        }

        return score;
    }
}
