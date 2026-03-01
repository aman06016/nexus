package com.nexusai.modules.article.domain;

import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "articles")
public class Article {

    @Id
    private String id;

    @Indexed(unique = true)
    private String canonicalUrl;

    private String url;
    private String urlHash;
    private String title;
    private String summary;
    private String fullText;
    private String author;
    private Instant publishedAt;
    private Instant scrapedAt;
    private SourceInfo source;
    private List<String> companies;
    private List<String> tags;
    private String category;
    private String sentiment;
    private Integer impactScore;
    private String thumbnail;
    private List<Double> embedding;

    @Builder.Default
    private ArticleStats stats = new ArticleStats();

    @Builder.Default
    private String status = "PUBLISHED";

    private String lang;
    private String duplicateOf;
}
