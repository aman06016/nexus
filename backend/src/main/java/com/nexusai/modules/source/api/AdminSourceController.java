package com.nexusai.modules.source.api;

import com.nexusai.modules.source.application.SourceService;
import com.nexusai.modules.source.domain.Source;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/admin/sources")
@RequiredArgsConstructor
public class AdminSourceController {

    private final SourceService sourceService;

    @GetMapping
    public Flux<Source> listSources() {
        return sourceService.listSources();
    }

    @PostMapping("/{id}/pause")
    public Mono<Source> pause(@PathVariable("id") String sourceId) {
        return sourceService.pause(sourceId);
    }

    @PostMapping("/{id}/resume")
    public Mono<Source> resume(@PathVariable("id") String sourceId) {
        return sourceService.resume(sourceId);
    }

    @PostMapping("/{id}/rescrape")
    public Mono<Source> rescrape(@PathVariable("id") String sourceId) {
        return sourceService.markSuccess(sourceId);
    }
}
