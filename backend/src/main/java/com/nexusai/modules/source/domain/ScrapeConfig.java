package com.nexusai.modules.source.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScrapeConfig {
    private String url;
    private Integer intervalSeconds;
    private String selector;
    private String mode;
}
