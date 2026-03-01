package com.nexusai.modules.search.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class SearchWebClientConfig {

    @Bean("elasticsearchWebClient")
    public WebClient elasticsearchWebClient(@Value("${nexus.search.elastic-url}") String elasticUrl) {
        return WebClient.builder().baseUrl(elasticUrl).build();
    }
}
