package com.nexusai.modules.search.api;

import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.search.application.ArticleSearchService;
import com.nexusai.modules.search.application.SearchCriteria;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class SearchController {

    private final ArticleSearchService articleSearchService;

    @GetMapping("/search")
    public Flux<Article> search(
        @RequestParam(name = "q", required = false) String query,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String company,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        SearchCriteria criteria = new SearchCriteria(query, category, company, page, limit);
        return articleSearchService.search(criteria);
    }
}
