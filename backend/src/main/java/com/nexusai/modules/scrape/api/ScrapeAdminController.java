package com.nexusai.modules.scrape.api;

import com.nexusai.modules.scrape.domain.RawArticleEvent;
import com.nexusai.modules.scrape.infrastructure.ScrapeEventPublisher;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/admin/scrape")
@RequiredArgsConstructor
public class ScrapeAdminController {

    private final ScrapeEventPublisher scrapeEventPublisher;

    @PostMapping("/publish-test")
    public void publishTestEvent(@RequestBody PublishTestEventRequest request) {
        RawArticleEvent event = new RawArticleEvent(
            "manual",
            request.sourceName(),
            request.sourceDomain(),
            request.sourceUrl(),
            request.articleUrl(),
            request.discoveredTitle(),
            Instant.now()
        );

        scrapeEventPublisher.publish(event);
    }

    public record PublishTestEventRequest(
        @NotBlank String sourceName,
        @NotBlank String sourceDomain,
        @NotBlank String sourceUrl,
        @NotBlank String articleUrl,
        @NotBlank String discoveredTitle
    ) {
    }
}
