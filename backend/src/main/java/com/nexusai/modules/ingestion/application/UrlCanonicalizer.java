package com.nexusai.modules.ingestion.application;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class UrlCanonicalizer {

    public String canonicalize(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        try {
            URI uri = new URI(url.trim());
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "https";
            String host = uri.getHost();
            if (host == null) {
                return null;
            }

            host = host.toLowerCase(Locale.ROOT);
            String path = normalizePath(uri.getPath());
            String query = normalizeQuery(uri.getRawQuery());

            URI normalized = new URI(scheme, null, host, -1, path, query, null);
            return normalized.toString();
        } catch (URISyntaxException ex) {
            return null;
        }
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }

        String normalized = path.trim();
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        return normalized;
    }

    private String normalizeQuery(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank()) {
            return null;
        }

        List<String> filtered = new ArrayList<>();
        for (String part : rawQuery.split("&")) {
            if (part.isBlank()) {
                continue;
            }

            String key = part.split("=", 2)[0].toLowerCase(Locale.ROOT);
            if (key.startsWith("utm_") || key.equals("gclid") || key.equals("fbclid")) {
                continue;
            }

            filtered.add(part);
        }

        if (filtered.isEmpty()) {
            return null;
        }

        filtered.sort(Comparator.naturalOrder());
        return String.join("&", filtered.stream().filter(Objects::nonNull).toList());
    }
}
