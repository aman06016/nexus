package com.nexusai.modules.source.infrastructure;

import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.source.domain.SourceStatus;
import org.springframework.data.mongodb.repository.ReactiveMongoRepository;
import reactor.core.publisher.Flux;

public interface SourceRepository extends ReactiveMongoRepository<Source, String> {
    Flux<Source> findByStatus(SourceStatus status);

    Flux<Source> findByOrderByTierAscNameAsc();
}
