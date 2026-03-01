package com.nexusai.modules.article.application;

import com.nexusai.common.domain.ResourceNotFoundException;
import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class ArticleService {

    private final ArticleRepository articleRepository;

    public Flux<Article> getLatest(int page, int limit) {
        return articleRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED", PageRequest.of(page, limit));
    }

    public Flux<Article> getTrending(int page, int limit) {
        return articleRepository.findByStatusOrderByImpactScoreDescPublishedAtDesc("PUBLISHED", PageRequest.of(page, limit));
    }

    public Mono<Article> getById(String id) {
        return articleRepository.findById(id)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Article not found: " + id)));
    }
}
