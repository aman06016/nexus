package com.nexusai.modules.search.infrastructure;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexusai.modules.article.domain.Article;
import com.nexusai.modules.search.application.SearchCriteria;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class ElasticsearchArticleClient {

    @Qualifier("elasticsearchWebClient")
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${nexus.search.index-name}")
    private String indexName;

    public Mono<Void> ensureIndex() {
        ObjectNode root = objectMapper.createObjectNode();
        ObjectNode mappings = root.putObject("mappings");
        ObjectNode properties = mappings.putObject("properties");

        properties.putObject("articleId").put("type", "keyword");
        properties.putObject("title").put("type", "text");
        properties.putObject("summary").put("type", "text");
        properties.putObject("fullText").put("type", "text");
        properties.putObject("category").put("type", "keyword");
        properties.putObject("companies").put("type", "keyword");
        properties.putObject("publishedAt").put("type", "date");
        properties.putObject("sourceName").put("type", "keyword");

        return webClient.put()
            .uri("/{index}", indexName)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(root.toString())
            .exchangeToMono(response -> {
                if (response.statusCode().is2xxSuccessful()) {
                    return Mono.<Void>empty();
                }
                return response.bodyToMono(String.class)
                    .flatMap(body -> {
                        if (body.contains("resource_already_exists_exception")) {
                            return Mono.<Void>empty();
                        }
                        return Mono.error(new IllegalStateException("Failed to ensure index: " + body));
                    });
            })
            .onErrorResume(ex -> {
                log.warn("Elasticsearch ensureIndex failed: {}", ex.getMessage());
                return Mono.<Void>empty();
            });
    }

    public Mono<Void> indexArticle(Article article) {
        if (article.getId() == null) {
            return Mono.empty();
        }

        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("articleId", article.getId());
        payload.put("title", nullSafe(article.getTitle()));
        payload.put("summary", nullSafe(article.getSummary()));
        payload.put("fullText", nullSafe(article.getFullText()));
        payload.put("category", nullSafe(article.getCategory()));
        payload.put("publishedAt", article.getPublishedAt() != null ? article.getPublishedAt().toString() : null);
        payload.put("sourceName", article.getSource() != null ? nullSafe(article.getSource().getName()) : "");

        ArrayNode companies = payload.putArray("companies");
        if (article.getCompanies() != null) {
            article.getCompanies().forEach(companies::add);
        }

        return webClient.put()
            .uri("/{index}/_doc/{id}", indexName, article.getId())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload.toString())
            .retrieve()
            .bodyToMono(String.class)
            .then()
            .onErrorResume(ex -> {
                log.warn("Failed to index article id={} reason={}", article.getId(), ex.getMessage());
                return Mono.empty();
            });
    }

    public Mono<List<String>> searchArticleIds(SearchCriteria criteria) {
        String payload;
        try {
            payload = buildSearchPayload(criteria);
        } catch (JsonProcessingException ex) {
            return Mono.just(Collections.emptyList());
        }

        return webClient.post()
            .uri("/{index}/_search", indexName)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(String.class)
            .map(this::parseIds)
            .onErrorResume(ex -> {
                log.warn("Search request failed: {}", ex.getMessage());
                return Mono.just(Collections.emptyList());
            });
    }

    private String buildSearchPayload(SearchCriteria criteria) throws JsonProcessingException {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("from", Math.max(criteria.page(), 0) * Math.max(criteria.limit(), 1));
        root.put("size", Math.max(criteria.limit(), 1));

        ObjectNode query = root.putObject("query").putObject("bool");
        ArrayNode must = query.putArray("must");
        ArrayNode should = query.putArray("should");
        ArrayNode filter = query.putArray("filter");
        ArrayNode mustNot = query.putArray("must_not");

        if (criteria.query() != null && !criteria.query().isBlank()) {
            String normalizedQuery = criteria.query().trim();
            ObjectNode multiMatch = objectMapper.createObjectNode();
            multiMatch.put("query", normalizedQuery);
            multiMatch.put("type", "best_fields");
            multiMatch.put("minimum_should_match", "75%");
            ArrayNode fields = multiMatch.putArray("fields");
            fields.add("title^4");
            fields.add("summary^2");
            fields.add("fullText");
            fields.add("companies^2");
            fields.add("category");
            must.addObject().set("multi_match", multiMatch);

            should.addObject()
                .putObject("match_phrase")
                .putObject("title")
                .put("query", normalizedQuery)
                .put("boost", 4);
            should.addObject()
                .putObject("match_phrase")
                .putObject("companies")
                .put("query", normalizedQuery)
                .put("boost", 5);
            should.addObject()
                .putObject("match_phrase")
                .putObject("sourceName")
                .put("query", normalizedQuery)
                .put("boost", 2);
            query.put("minimum_should_match", 0);
        } else {
            must.addObject().putObject("match_all");
        }

        if (criteria.category() != null && !criteria.category().isBlank()) {
            ObjectNode categoryTerm = filter.addObject().putObject("term").putObject("category");
            categoryTerm.put("value", criteria.category());
            categoryTerm.put("case_insensitive", true);
        }

        if (criteria.company() != null && !criteria.company().isBlank()) {
            ObjectNode companyTerm = filter.addObject().putObject("term").putObject("companies");
            companyTerm.put("value", criteria.company());
            companyTerm.put("case_insensitive", true);
        }

        mustNot.addObject().putObject("match_phrase").putObject("title").put("query", "skip to main content");
        mustNot.addObject().putObject("match_phrase").putObject("title").put("query", "home \\\\ anthropic");
        mustNot.addObject().putObject("match_phrase").putObject("title").put("query", "research");
        mustNot.addObject().putObject("match_phrase").putObject("title").put("query", "sign in");

        ArrayNode sort = root.putArray("sort");
        sort.addObject().putObject("_score").put("order", "desc");
        sort.addObject().putObject("publishedAt").put("order", "desc");

        return objectMapper.writeValueAsString(root);
    }

    private List<String> parseIds(String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode hits = root.path("hits").path("hits");
            List<String> ids = new ArrayList<>();
            if (hits.isArray()) {
                for (JsonNode hit : hits) {
                    String id = hit.path("_id").asText();
                    if (!id.isBlank()) {
                        ids.add(id);
                    }
                }
            }
            return ids;
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
