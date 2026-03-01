package com.nexusai.modules.interaction.domain;

import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "interactions")
@CompoundIndex(name = "session_article_type_idx", def = "{'sessionId': 1, 'articleId': 1, 'type': 1}", unique = true)
public class Interaction {

    @Id
    private String id;

    private String sessionId;
    private String articleId;
    private InteractionType type;
    private Instant timestamp;
    private String ipHash;
    private String userAgentHash;
}
