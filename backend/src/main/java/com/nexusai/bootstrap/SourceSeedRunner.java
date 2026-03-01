package com.nexusai.bootstrap;

import com.nexusai.modules.source.domain.ScrapeConfig;
import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.source.domain.SourceStatus;
import com.nexusai.modules.source.domain.SourceType;
import com.nexusai.modules.source.infrastructure.SourceRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SourceSeedRunner implements CommandLineRunner {

    private final SourceRepository sourceRepository;

    @Override
    public void run(String... args) {
        sourceRepository.count()
            .filter(count -> count == 0)
            .flatMapMany(ignored -> sourceRepository.saveAll(defaultSources()))
            .subscribe();
    }

    private List<Source> defaultSources() {
        return List.of(
            Source.builder()
                .name("OpenAI Blog")
                .domain("openai.com")
                .tier("TIER_1")
                .type(SourceType.HTML)
                .status(SourceStatus.ACTIVE)
                .successRate(1.0)
                .articlesPerDay(10)
                .scrapeConfig(ScrapeConfig.builder().url("https://openai.com/news/").mode("JSOUP").intervalSeconds(120).build())
                .build(),
            Source.builder()
                .name("Anthropic News")
                .domain("anthropic.com")
                .tier("TIER_1")
                .type(SourceType.HTML)
                .status(SourceStatus.ACTIVE)
                .successRate(1.0)
                .articlesPerDay(8)
                .scrapeConfig(ScrapeConfig.builder().url("https://www.anthropic.com/news").mode("JSOUP").intervalSeconds(120).build())
                .build(),
            Source.builder()
                .name("Google Blog")
                .domain("blog.google")
                .tier("TIER_1")
                .type(SourceType.HTML)
                .status(SourceStatus.ACTIVE)
                .successRate(1.0)
                .articlesPerDay(12)
                .scrapeConfig(ScrapeConfig.builder().url("https://blog.google/technology/ai/").mode("JSOUP").intervalSeconds(120).build())
                .build()
        );
    }
}
