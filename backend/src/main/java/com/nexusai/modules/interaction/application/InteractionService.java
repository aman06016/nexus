package com.nexusai.modules.interaction.application;

import com.nexusai.common.domain.ResourceNotFoundException;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import com.nexusai.modules.interaction.infrastructure.InteractionRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
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

    private Mono<InteractionToggleResponse> toggle(String articleId, String sessionId, InteractionType type, String statsField) {
        return articleRepository.existsById(articleId)
            .flatMap(exists -> {
                if (!exists) {
                    return Mono.error(new ResourceNotFoundException("Article not found: " + articleId));
                }
                return interactionRepository.findBySessionIdAndArticleIdAndType(sessionId, articleId, type)
                    .flatMap(existing -> interactionRepository.deleteById(existing.getId()).thenReturn(false))
                    .switchIfEmpty(
                        interactionRepository.save(
                            Interaction.builder()
                                .sessionId(sessionId)
                                .articleId(articleId)
                                .type(type)
                                .timestamp(Instant.now())
                                .build()
                        ).thenReturn(true)
                    )
                    .flatMap(active -> interactionRepository.countByArticleIdAndType(articleId, type)
                        .flatMap(count -> syncArticleCounter(articleId, statsField, count)
                            .thenReturn(new InteractionToggleResponse(active, count))));
            });
    }

    private Mono<Void> syncArticleCounter(String articleId, String statsField, long count) {
        Query query = Query.query(Criteria.where("_id").is(articleId));
        Update update = new Update().set(statsField, count);
        return mongoTemplate.updateFirst(query, update, "articles").then();
    }
}
