package com.nexusai.modules.search.application;

import com.nexusai.modules.article.application.ArticleQualityFilter;
import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.search.infrastructure.ElasticsearchArticleClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class ArticleSearchService {

    private final ElasticsearchArticleClient elasticsearchArticleClient;
    private final ArticleRepository articleRepository;
    private final ArticleQualityFilter articleQualityFilter;

    public Flux<Article> search(SearchCriteria criteria) {
        return elasticsearchArticleClient.searchArticleIds(criteria)
            .flatMapMany(this::loadArticlesInOrder);
    }

    private Flux<Article> loadArticlesInOrder(List<String> ids) {
        if (ids.isEmpty()) {
            return Flux.empty();
        }

        return Flux.fromIterable(ids)
            .concatMap(articleRepository::findById)
            .filter(articleQualityFilter::isDisplayable);
    }
}
