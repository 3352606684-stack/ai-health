package com.example.aihealth.controller;

import com.example.aihealth.dto.ChatRequest;
import com.example.aihealth.service.AiChatService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** AI 咨询对话（流式） */
@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    private final AiChatService service;

    public AiChatController(AiChatService service) {
        this.service = service;
    }

    /**
     * 0L = 永不超时。默认 30 秒，长回答会被 Tomcat 直接掐断。
     * X-Accel-Buffering: no 用来对抗 Nginx 缓冲，否则线上会变成"一次性蹦出来"。
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> stream(@RequestBody ChatRequest req) {
        SseEmitter emitter = new SseEmitter(0L);
        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> emitter.complete());

        service.start(emitter, req);

        return ResponseEntity.ok()
                .header("X-Accel-Buffering", "no")
                .header("Cache-Control", "no-cache")
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(emitter);
    }
}
