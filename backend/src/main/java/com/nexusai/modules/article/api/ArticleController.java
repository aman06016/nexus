package com.nexusai.modules.article.api;

import com.nexusai.modules.article.application.ArticleService;
import com.nexusai.modules.article.domain.Article;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping("/articles")
    public Flux<Article> getArticles(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return articleService.getLatest(page, limit);
    }

    @GetMapping("/articles/{id}")
    public Mono<Article> getArticleById(@PathVariable String id) {
        return articleService.getById(id);
    }

    @GetMapping("/trending")
    public Flux<Article> getTrending(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return articleService.getTrending(page, limit);
    }
}
