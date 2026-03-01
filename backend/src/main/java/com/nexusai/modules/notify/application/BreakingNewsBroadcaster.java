package com.nexusai.modules.notify.application;

import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Service
public class BreakingNewsBroadcaster {

    private final Sinks.Many<String> sink = Sinks.many().multicast().directBestEffort();

    public void publish(String payload) {
        sink.tryEmitNext(payload);
    }

    public Flux<String> stream() {
        return sink.asFlux();
    }
}
