package com.nexusai.modules.source.application;

import com.nexusai.common.domain.ResourceNotFoundException;
import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.source.domain.SourceStatus;
import com.nexusai.modules.source.infrastructure.SourceRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class SourceService {

    private final SourceRepository sourceRepository;

    public Flux<Source> listSources() {
        return sourceRepository.findByOrderByTierAscNameAsc();
    }

    public Flux<Source> listActiveSources() {
        return sourceRepository.findByStatus(SourceStatus.ACTIVE);
    }

    public Mono<Source> pause(String sourceId) {
        return updateStatus(sourceId, SourceStatus.PAUSED);
    }

    public Mono<Source> resume(String sourceId) {
        return updateStatus(sourceId, SourceStatus.ACTIVE);
    }

    public Mono<Source> markSuccess(String sourceId) {
        return sourceRepository.findById(sourceId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Source not found: " + sourceId)))
            .flatMap(source -> {
                source.setLastSuccess(Instant.now());
                source.setStatus(SourceStatus.ACTIVE);
                return sourceRepository.save(source);
            });
    }

    private Mono<Source> updateStatus(String sourceId, SourceStatus status) {
        return sourceRepository.findById(sourceId)
            .switchIfEmpty(Mono.error(new ResourceNotFoundException("Source not found: " + sourceId)))
            .flatMap(source -> {
                source.setStatus(status);
                return sourceRepository.save(source);
            });
    }
}
