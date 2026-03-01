package com.nexusai.modules.scrape.application;

import com.nexusai.modules.source.domain.Source;
import java.util.Optional;

public interface SourcePageFetcher {

    Optional<PageSnapshot> fetch(Source source);
}
