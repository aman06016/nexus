package com.nexusai.modules.article.infrastructure;

import com.nexusai.modules.article.domain.Article;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface ArticleRepository extends ReactiveMongoRepository<Article, String> {
    Flux<Article> findByStatusOrderByPublishedAtDesc(String status, Pageable pageable);

    Flux<Article> findByStatusOrderByImpactScoreDescPublishedAtDesc(String status, Pageable pageable);
}
