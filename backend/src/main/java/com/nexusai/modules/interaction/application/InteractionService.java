package com.nexusai.modules.interaction.application;

import com.nexusai.common.domain.ResourceNotFoundException;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import com.nexusai.modules.interaction.infrastructure.InteractionRepository;
import java.time.Instant;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private final ArticleRepository articleRepository;
    private final InteractionRepository interactionRepository;
    private final ReactiveMongoTemplate mongoTemplate;

    public Mono<InteractionToggleResponse> toggleLike(String articleId, String sessionId) {
        return toggle(articleId, sessionId, InteractionType.LIKE, "stats.likes");
    }

    public Mono<InteractionToggleResponse> toggleSave(String articleId, String sessionId) {
        return toggle(articleId, sessionId, InteractionType.SAVE, "stats.saves");
    }

    public Mono<InteractionStateResponse> getInteractionState(String sessionId, List<String> articleIds) {
        if (sessionId == null || sessionId.isBlank() || articleIds == null || articleIds.isEmpty()) {
            return Mono.just(new InteractionStateResponse(Map.of()));
        }

        return interactionRepository.findBySessionIdAndArticleIdInAndTypeIn(
                sessionId,
                articleIds,
                EnumSet.of(InteractionType.SAVE, InteractionType.LIKE)
            )
            .collectList()
            .map(interactions -> {
                Map<String, ArticleInteractionState> states = new HashMap<>();
                for (Interaction interaction : interactions) {
                    ArticleInteractionState current = states.getOrDefault(interaction.getArticleId(), new ArticleInteractionState(false, false));
                    boolean nextSaved = current.saved() || interaction.getType() == InteractionType.SAVE;
                    boolean nextLiked = current.liked() || interaction.getType() == InteractionType.LIKE;
                    states.put(interaction.getArticleId(), new ArticleInteractionState(nextSaved, nextLiked));
                }
                return new InteractionStateResponse(states);
            });
    }

    private Mono<InteractionToggleResponse> toggle(String articleId, String sessionId, InteractionType type, String statsField) {
        return articleRepository.existsById(articleId)
            .flatMap(exists -> {
                if (!exists) {
                    return Mono.error(new ResourceNotFoundException("Article not found: " + articleId));
                }

                return interactionRepository.findAllBySessionIdAndArticleIdAndType(sessionId, articleId, type)
                    .collectList()
                    .flatMap(existingInteractions -> toggleInteractionRecord(articleId, sessionId, type, existingInteractions))
                    .flatMap(active -> interactionRepository.countByArticleIdAndType(articleId, type)
                        .flatMap(count -> syncArticleCounter(articleId, statsField, count)
                            .thenReturn(new InteractionToggleResponse(active, count))));
            });
    }

    private Mono<Boolean> toggleInteractionRecord(
        String articleId,
        String sessionId,
        InteractionType type,
        List<Interaction> existingInteractions
    ) {
        if (existingInteractions.isEmpty()) {
            return interactionRepository.save(
                    Interaction.builder()
                        .sessionId(sessionId)
                        .articleId(articleId)
                        .type(type)
                        .timestamp(Instant.now())
                        .build()
                )
                .thenReturn(true)
                .onErrorResume(DuplicateKeyException.class, ignored -> Mono.just(true));
        }

        return interactionRepository.deleteAll(existingInteractions).thenReturn(false);
    }

    private Mono<Void> syncArticleCounter(String articleId, String statsField, long count) {
        Query query = Query.query(Criteria.where("_id").is(articleId));
        Update update = new Update().set(statsField, count);
        return mongoTemplate.updateFirst(query, update, "articles").then();
    }
}
