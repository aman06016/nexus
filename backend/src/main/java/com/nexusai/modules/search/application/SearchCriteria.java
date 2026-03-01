package com.nexusai.modules.search.application;

public record SearchCriteria(
    String query,
    String category,
    String company,
    int page,
    int limit
) {
}
