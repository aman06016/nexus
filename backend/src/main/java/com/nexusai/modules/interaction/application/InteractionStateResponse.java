package com.nexusai.modules.interaction.application;

import java.util.Map;

public record InteractionStateResponse(Map<String, ArticleInteractionState> states) {
}
