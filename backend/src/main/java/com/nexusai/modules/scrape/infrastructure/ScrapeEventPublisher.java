package com.nexusai.modules.scrape.infrastructure;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.modules.scrape.domain.RawArticleEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScrapeEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${nexus.kafka.topics.raw-articles}")
    private String rawArticlesTopic;

    public void publish(RawArticleEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(rawArticlesTopic, event.sourceDomain(), payload);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize raw article event for url={} reason={}", event.articleUrl(), ex.getMessage());
        }
    }
}
