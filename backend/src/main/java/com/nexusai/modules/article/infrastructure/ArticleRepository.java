package com.nexusai.modules.article.infrastructure;

import com.nexusai.modules.article.domain.Article;
import java.util.Collection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ArticleRepository extends ReactiveMongoRepository<Article, String> {
    Flux<Article> findByStatusOrderByPublishedAtDesc(String status, Pageable pageable);

    Flux<Article> findByStatusOrderByImpactScoreDescPublishedAtDesc(String status, Pageable pageable);

    Mono<Article> findByCanonicalUrl(String canonicalUrl);

    Flux<Article> findByIdIn(Collection<String> ids);

    Mono<Long> countByStatus(String status);
}
