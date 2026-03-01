package com.nexusai.modules.interaction.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mongodb.client.result.UpdateResult;
import com.nexusai.modules.article.infrastructure.ArticleRepository;
import com.nexusai.modules.interaction.domain.Interaction;
import com.nexusai.modules.interaction.domain.InteractionType;
import com.nexusai.modules.interaction.infrastructure.InteractionRepository;
import java.time.Instant;
import java.util.List;
import org.bson.BsonInt64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

@ExtendWith(MockitoExtension.class)
class InteractionServiceTests {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private InteractionRepository interactionRepository;

    @Mock
    private ReactiveMongoTemplate mongoTemplate;

    private InteractionService interactionService;

    @BeforeEach
    void setUp() {
        interactionService = new InteractionService(articleRepository, interactionRepository, mongoTemplate);
    }

    @Test
    void toggleSave_activatesWhenNoExistingInteraction() {
        String articleId = "article-1";
        String sessionId = "session-1";

        when(articleRepository.existsById(articleId)).thenReturn(Mono.just(true));
        when(interactionRepository.findAllBySessionIdAndArticleIdAndType(sessionId, articleId, InteractionType.SAVE))
            .thenReturn(Flux.empty());
        when(interactionRepository.save(any(Interaction.class))).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        when(interactionRepository.countByArticleIdAndType(articleId, InteractionType.SAVE)).thenReturn(Mono.just(1L));
        when(mongoTemplate.updateFirst(any(), any(), anyString()))
            .thenReturn(Mono.just(UpdateResult.acknowledged(1L, 1L, new BsonInt64(1L))));

        StepVerifier.create(interactionService.toggleSave(articleId, sessionId))
            .assertNext(response -> {
                assertThat(response.active()).isTrue();
                assertThat(response.totalCount()).isEqualTo(1L);
            })
            .verifyComplete();

        verify(interactionRepository, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void toggleSave_deactivatesAndDeletesAllLegacyDuplicates() {
        String articleId = "article-1";
        String sessionId = "session-1";
        Interaction first = Interaction.builder()
            .id("int-1")
            .articleId(articleId)
            .sessionId(sessionId)
            .type(InteractionType.SAVE)
            .timestamp(Instant.now())
            .build();
        Interaction second = Interaction.builder()
            .id("int-2")
            .articleId(articleId)
            .sessionId(sessionId)
            .type(InteractionType.SAVE)
            .timestamp(Instant.now())
            .build();

        when(articleRepository.existsById(articleId)).thenReturn(Mono.just(true));
        when(interactionRepository.findAllBySessionIdAndArticleIdAndType(sessionId, articleId, InteractionType.SAVE))
            .thenReturn(Flux.fromIterable(List.of(first, second)));
        when(interactionRepository.deleteAll(any(Iterable.class))).thenReturn(Mono.empty());
        when(interactionRepository.countByArticleIdAndType(articleId, InteractionType.SAVE)).thenReturn(Mono.just(0L));
        when(mongoTemplate.updateFirst(any(), any(), anyString()))
            .thenReturn(Mono.just(UpdateResult.acknowledged(1L, 1L, new BsonInt64(0L))));

        StepVerifier.create(interactionService.toggleSave(articleId, sessionId))
            .assertNext(response -> {
                assertThat(response.active()).isFalse();
                assertThat(response.totalCount()).isEqualTo(0L);
            })
            .verifyComplete();

        verify(interactionRepository).deleteAll(any(Iterable.class));
        verify(interactionRepository, never()).save(any(Interaction.class));
    }

    @Test
    void getInteractionState_returnsSavedAndLikedFlagsPerArticle() {
        String sessionId = "session-1";
        List<String> articleIds = List.of("article-1", "article-2");

        Interaction save = Interaction.builder()
            .id("int-1")
            .articleId("article-1")
            .sessionId(sessionId)
            .type(InteractionType.SAVE)
            .timestamp(Instant.now())
            .build();
        Interaction like = Interaction.builder()
            .id("int-2")
            .articleId("article-1")
            .sessionId(sessionId)
            .type(InteractionType.LIKE)
            .timestamp(Instant.now())
            .build();

        when(interactionRepository.findBySessionIdAndArticleIdInAndTypeIn(anyString(), any(), any()))
            .thenReturn(Flux.just(save, like));

        StepVerifier.create(interactionService.getInteractionState(sessionId, articleIds))
            .assertNext(response -> {
                assertThat(response.states().get("article-1")).isNotNull();
                assertThat(response.states().get("article-1").saved()).isTrue();
                assertThat(response.states().get("article-1").liked()).isTrue();
                assertThat(response.states()).doesNotContainKey("article-2");
            })
            .verifyComplete();
    }
}
