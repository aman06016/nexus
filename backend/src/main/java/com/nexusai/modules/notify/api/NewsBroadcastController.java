package com.nexusai.modules.notify.api;

import com.nexusai.modules.notify.application.BreakingNewsBroadcaster;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/admin/news")
@RequiredArgsConstructor
public class NewsBroadcastController {

    private final BreakingNewsBroadcaster broadcaster;

    @PostMapping("/publish")
    public void publish(@RequestBody PublishRequest request) {
        broadcaster.publish(request.message());
    }

    public record PublishRequest(@NotBlank String message) {
    }
}
