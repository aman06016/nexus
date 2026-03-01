package com.nexusai.modules.notify.infrastructure;

import com.nexusai.modules.notify.application.BreakingNewsBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class BreakingNewsWebSocketHandler implements WebSocketHandler {

    private final BreakingNewsBroadcaster broadcaster;

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        return session.send(
            broadcaster.stream().map(session::textMessage)
        );
    }
}
