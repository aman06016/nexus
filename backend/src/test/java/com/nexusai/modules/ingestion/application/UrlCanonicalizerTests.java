package com.nexusai.modules.ingestion.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class UrlCanonicalizerTests {

    private final UrlCanonicalizer canonicalizer = new UrlCanonicalizer();

    @Test
    void canonicalizeStripsTrackingParams() {
        String url = "https://OpenAI.com/blog/new-model/?utm_source=x&b=2&a=1&gclid=abc";
        String canonical = canonicalizer.canonicalize(url);
        assertEquals("https://openai.com/blog/new-model?a=1&b=2", canonical);
    }

    @Test
    void canonicalizeReturnsNullForInvalidUrl() {
        assertNull(canonicalizer.canonicalize("not-a-url"));
    }
}
