package com.nexusai.modules.source.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.nexusai.modules.source.domain.Source;
import com.nexusai.modules.source.domain.SourceStatus;
import com.nexusai.modules.source.infrastructure.SourceRepository;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class SourceServiceTests {

    @Mock
    private SourceRepository sourceRepository;

    private SourceService sourceService;

    @BeforeEach
    void setUp() {
        sourceService = new SourceService(sourceRepository);
    }

    @Test
    void markSuccess_updatesTimestampWithoutChangingStatus() {
        Source pausedSource = Source.builder()
            .id("source-1")
            .name("Example")
            .status(SourceStatus.PAUSED)
            .build();

        when(sourceRepository.findById("source-1")).thenReturn(Mono.just(pausedSource));
        when(sourceRepository.save(any(Source.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));

        StepVerifier.create(sourceService.markSuccess("source-1"))
            .assertNext(updated -> {
                assertThat(updated.getStatus()).isEqualTo(SourceStatus.PAUSED);
                assertThat(updated.getLastSuccess()).isNotNull();
                assertThat(updated.getLastSuccess()).isBeforeOrEqualTo(Instant.now());
            })
            .verifyComplete();
    }
}
