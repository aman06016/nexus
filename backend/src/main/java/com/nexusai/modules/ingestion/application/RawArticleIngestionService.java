package com.nexusai.modules.ingestion.application;

import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.notify.application.BreakingNewsBroadcaster;
import com.nexusai.modules.scrape.domain.RawArticleEvent;
import com.nexusai.modules.search.infrastructure.ElasticsearchArticleClient;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class RawArticleIngestionService {

    private final UrlCanonicalizer urlCanonicalizer;
    private final ArticleContentExtractor articleContentExtractor;
    private final ArticleRepository articleRepository;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final BreakingNewsBroadcaster breakingNewsBroadcaster;
    private final ElasticsearchArticleClient elasticsearchArticleClient;

    public Mono<Void> ingest(RawArticleEvent event) {
        String canonicalUrl = urlCanonicalizer.canonicalize(event.articleUrl());
        if (canonicalUrl == null) {
            return Mono.empty();
        }

        String seenKey = "nexus:dedup:url:" + canonicalUrl;

        return redisTemplate.opsForValue().setIfAbsent(seenKey, "1", Duration.ofHours(48))
            .flatMap(isNewUrl -> {
                if (!Boolean.TRUE.equals(isNewUrl)) {
                    return Mono.empty();
                }

                return articleRepository.findByCanonicalUrl(canonicalUrl)
                    .flatMap(existing -> Mono.<Article>empty())
                    .switchIfEmpty(Mono.fromSupplier(() -> articleContentExtractor.extract(event, canonicalUrl)))
                    .filter(article -> !isLowQualityArticle(article))
                    .flatMap(articleRepository::save)
                    .doOnSuccess(saved -> {
                        if (saved != null && saved.getPublishedAt() != null
                            && saved.getPublishedAt().isAfter(Instant.now().minusSeconds(1800))) {
                            breakingNewsBroadcaster.publish(saved.getTitle());
                        }
                    })
                    .flatMap(saved -> elasticsearchArticleClient.indexArticle(saved).thenReturn(saved))
                    .onErrorResume(DuplicateKeyException.class, ex -> Mono.empty())
                    .then();
            })
            .onErrorResume(ex -> {
                log.error("Ingestion failed for url={} reason={}", event.articleUrl(), ex.getMessage());
                return Mono.empty();
            });
    }

    private boolean isLowQualityArticle(Article article) {
        if (article == null) {
            return true;
        }

        String title = article.getTitle() == null ? "" : article.getTitle().toLowerCase();
        String url = article.getCanonicalUrl() == null ? "" : article.getCanonicalUrl().toLowerCase();
        String summary = article.getSummary() == null ? "" : article.getSummary().toLowerCase();
        String fullText = article.getFullText() == null ? "" : article.getFullText();

        boolean obviousShareOrAuth = title.contains("sign in")
            || title.contains("login")
            || title.contains("facebook")
            || title.equals("x.com")
            || url.contains("sharer")
            || url.contains("sharearticle")
            || url.contains("intent/tweet");

        boolean genericNavigationPage = title.equals("home")
            || title.equals("research")
            || title.equals("news")
            || title.contains("skip to main content")
            || title.contains("cookie policy")
            || title.contains("privacy policy");

        boolean tooThin = fullText.length() < 160 && summary.length() < 80;
        boolean poorTitle = title.length() < 15;

        return obviousShareOrAuth || genericNavigationPage || tooThin || poorTitle;
    }
}
