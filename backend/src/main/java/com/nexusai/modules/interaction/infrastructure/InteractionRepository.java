package com.nexusai.modules.interaction.infrastructure;

import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import java.util.Collection;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface InteractionRepository extends ReactiveMongoRepository<Interaction, String> {
    Mono<Interaction> findBySessionIdAndArticleIdAndType(String sessionId, String articleId, InteractionType type);

    Flux<Interaction> findAllBySessionIdAndArticleIdAndType(String sessionId, String articleId, InteractionType type);

    Mono<Long> countByArticleIdAndType(String articleId, InteractionType type);

    Flux<Interaction> findBySessionIdAndTypeOrderByTimestampDesc(String sessionId, InteractionType type);

    Flux<Interaction> findBySessionIdAndTypeInOrderByTimestampDesc(String sessionId, Collection<InteractionType> types);

    Flux<Interaction> findBySessionIdAndArticleIdInAndTypeIn(
        String sessionId,
        Collection<String> articleIds,
        Collection<InteractionType> types
    );
}
