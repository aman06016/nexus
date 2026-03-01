package com.nexusai.modules.article.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleStats {
    @Builder.Default
    private long views = 0;

    @Builder.Default
    private long likes = 0;

    @Builder.Default
    private long saves = 0;

    @Builder.Default
    private long shares = 0;
}
