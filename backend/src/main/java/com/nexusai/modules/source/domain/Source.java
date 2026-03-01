package com.nexusai.modules.source.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sources")
public class Source {

    @Id
    private String id;

    private String name;
    private String domain;
    private String tier;
    private SourceType type;
    private ScrapeConfig scrapeConfig;
    private SourceStatus status;
    private Instant lastSuccess;
    private Double successRate;
    private Integer articlesPerDay;
}
