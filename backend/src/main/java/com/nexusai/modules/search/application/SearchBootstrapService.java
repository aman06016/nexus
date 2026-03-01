package com.nexusai.modules.search.application;

import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.search.infrastructure.ElasticsearchArticleClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SearchBootstrapService {

    private final ElasticsearchArticleClient elasticsearchArticleClient;
    private final ArticleRepository articleRepository;

    @Value("${nexus.search.bootstrap-reindex-limit}")
    private int bootstrapReindexLimit;

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapIndex() {
        elasticsearchArticleClient.ensureIndex()
            .thenMany(articleRepository.findByStatusOrderByPublishedAtDesc("PUBLISHED", PageRequest.of(0, bootstrapReindexLimit)))
            .concatMap(article -> elasticsearchArticleClient.indexArticle(article).thenReturn(article.getId()))
            .count()
            .subscribe(count -> log.info("Search bootstrap completed. indexedArticles={}", count));
    }
}
