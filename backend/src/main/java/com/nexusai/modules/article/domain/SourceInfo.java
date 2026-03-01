package com.nexusai.modules.article.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SourceInfo {
    private String name;
    private String domain;
    private String tier;
    private double authorityScore;
}
