package com.nexusai.modules.interaction.api;

import com.nexusai.modules.interaction.application.InteractionService;
import com.nexusai.modules.interaction.application.InteractionStateResponse;
import com.nexusai.modules.interaction.application.InteractionToggleResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class InteractionController {

    private static final String SESSION_HEADER = "X-Session-Id";

    private final InteractionService interactionService;

    @GetMapping("/state")
    public Mono<InteractionStateResponse> getInteractionState(
        @RequestHeader(name = SESSION_HEADER, required = false) String sessionId,
        @RequestParam(name = "articleId") List<String> articleIds
    ) {
        return interactionService.getInteractionState(sessionId, articleIds);
    }

    @PostMapping("/{id}/like")
    public Mono<InteractionToggleResponse> toggleLike(
        @PathVariable("id") String articleId,
        @RequestHeader(name = SESSION_HEADER) String sessionId,
        @RequestHeader(name = HttpHeaders.USER_AGENT, required = false) String userAgent
    ) {
        return interactionService.toggleLike(articleId, sessionId);
    }

    @PostMapping("/{id}/save")
    public Mono<InteractionToggleResponse> toggleSave(
        @PathVariable("id") String articleId,
        @RequestHeader(name = SESSION_HEADER) String sessionId,
        @RequestHeader(name = HttpHeaders.USER_AGENT, required = false) String userAgent
    ) {
        return interactionService.toggleSave(articleId, sessionId);
    }
}
