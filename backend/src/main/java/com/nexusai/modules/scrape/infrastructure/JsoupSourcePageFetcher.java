package com.nexusai.modules.scrape.infrastructure;

import com.nexusai.modules.scrape.application.PageSnapshot;
import com.nexusai.modules.scrape.application.SourcePageFetcher;
import com.nexusai.modules.source.domain.Source;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class JsoupSourcePageFetcher implements SourcePageFetcher {

    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    public JsoupSourcePageFetcher(
        @Value("${nexus.scrape.connect-timeout-ms}") int connectTimeoutMs,
        @Value("${nexus.scrape.read-timeout-ms}") int readTimeoutMs
    ) {
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
    }

    @Override
    public Optional<PageSnapshot> fetch(Source source) {
        if (source.getScrapeConfig() == null || source.getScrapeConfig().getUrl() == null) {
            return Optional.empty();
        }

        try {
            Connection connection = Jsoup.connect(source.getScrapeConfig().getUrl())
                .timeout(connectTimeoutMs + readTimeoutMs)
                .userAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .followRedirects(true);

            Connection.Response response = connection.execute();
            if (response.statusCode() >= 400) {
                return Optional.empty();
            }

            return Optional.of(new PageSnapshot(response.body(), response.url().toString()));
        } catch (Exception ex) {
            log.warn("Jsoup fetch failed for source={} url={} reason={}", source.getName(), source.getScrapeConfig().getUrl(), ex.getMessage());
            return Optional.empty();
        }
    }
}
