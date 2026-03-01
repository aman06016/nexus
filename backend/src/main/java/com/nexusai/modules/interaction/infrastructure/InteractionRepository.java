package com.nexusai.modules.interaction.infrastructure;

import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Mono;

public interface InteractionRepository extends ReactiveMongoRepository<Interaction, String> {
    Mono<Interaction> findBySessionIdAndArticleIdAndType(String sessionId, String articleId, InteractionType type);

    Mono<Long> countByArticleIdAndType(String articleId, InteractionType type);
}
