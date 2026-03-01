package com.nexusai.modules.ingestion.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusai.modules.ingestion.application.RawArticleIngestionService;
import com.nexusai.modules.scrape.domain.RawArticleEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RawArticleKafkaConsumer {

    private final ObjectMapper objectMapper;
    private final RawArticleIngestionService ingestionService;

    @KafkaListener(topics = "${nexus.kafka.topics.raw-articles}", groupId = "nexus-ingestion")
    public void consume(String payload) {
        try {
            RawArticleEvent event = objectMapper.readValue(payload, RawArticleEvent.class);
            ingestionService.ingest(event).block();
        } catch (Exception ex) {
            log.error("Failed to consume raw article payload reason={}", ex.getMessage());
        }
    }
}
