package com.nexusai.modules.scrape.infrastructure;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.nexusai.modules.scrape.application.PageSnapshot;
import com.nexusai.modules.scrape.application.SourcePageFetcher;
import com.nexusai.modules.source.domain.Source;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PlaywrightSourcePageFetcher implements SourcePageFetcher {

    @Override
    public Optional<PageSnapshot> fetch(Source source) {
        if (source.getScrapeConfig() == null || source.getScrapeConfig().getUrl() == null) {
            return Optional.empty();
        }

        try (Playwright playwright = Playwright.create()) {
            BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions().setHeadless(true);
            Browser browser = playwright.chromium().launch(launchOptions);
            Page page = browser.newPage();
            page.navigate(source.getScrapeConfig().getUrl(), new Page.NavigateOptions().setTimeout(20_000));
            page.waitForTimeout(1500);
            String html = page.content();
            String resolvedUrl = page.url();
            browser.close();
            return Optional.of(new PageSnapshot(html, resolvedUrl));
        } catch (Exception ex) {
            log.warn("Playwright fetch failed for source={} url={} reason={}", source.getName(), source.getScrapeConfig().getUrl(), ex.getMessage());
            return Optional.empty();
        }
    }
}
