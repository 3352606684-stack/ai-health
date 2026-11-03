package com.example.aihealth.service;

import com.example.aihealth.config.AiProperties;
import com.example.aihealth.dto.ChatRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 把大模型的流式输出原样转成 SSE 推给前端。
 *
 * <p>核心原则：收到一行就发一行，任何环节攒包都会让流式失效。</p>
 */
@Service
public class AiChatService {

    private static final Logger log = LoggerFactory.getLogger(AiChatService.class);

    private final AiProperties props;
    private final ObjectMapper mapper;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    public AiChatService(AiProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
    }

    /**
     * 起一条虚拟线程跑流，立刻把 emitter 交还给 Tomcat。
     * 用虚拟线程是因为一次对话要阻塞几十秒，平台线程池会被占满。
     */
    public void start(SseEmitter emitter, ChatRequest req) {
        Thread.startVirtualThread(() -> doStream(emitter, req));
    }

    private void doStream(SseEmitter emitter, ChatRequest req) {
        if (props.getApiKey() == null || props.getApiKey().isBlank()) {
            send(emitter, Map.of("error", "后端未配置 AI_API_KEY，请先在环境变量里设置"));
            emitter.complete();
            return;
        }

        try {
            HttpResponse<InputStream> resp =
                    http.send(buildRequest(req), HttpResponse.BodyHandlers.ofInputStream());

            if (resp.statusCode() != 200) {
                String body;
                try (InputStream in = resp.body()) {
                    body = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
                log.warn("模型接口返回 {}：{}", resp.statusCode(), body);
                send(emitter, Map.of("error", "AI 服务返回异常（" + resp.statusCode() + "）"));
                emitter.complete();
                return;
            }

            try (InputStream in = resp.body();
                 BufferedReader reader = new BufferedReader(
                         new InputStreamReader(in, StandardCharsets.UTF_8))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    // 模型的流是 SSE：只有 data: 开头的是内容，其余是空行或注释
                    if (!line.startsWith("data:")) continue;

                    String payload = line.substring(5).trim();
                    if (payload.isEmpty()) continue;
                    if ("[DONE]".equals(payload)) break;

                    String delta = readDelta(payload);
                    if (delta != null && !delta.isEmpty()) {
                        send(emitter, Map.of("delta", delta));
                    }
                }
            }

            send(emitter, Map.of("done", true));
            emitter.complete();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            emitter.complete();
        } catch (Exception e) {
            // 用户在页面上点「停止」会主动断连，这里会抛 IOException，属正常
            log.debug("流式对话中断：{}", e.toString());
            try {
                send(emitter, Map.of("error", "生成中断，请重试"));
            } catch (Exception ignore) {
                // 连接已经断了，发不出去是正常的
            }
            try {
                emitter.complete();
            } catch (Exception ignore) {
                // 同上
            }
        }
    }

    /** 把一段增量写成一条 SSE。用 JSON 包一层，是为了让 \n 之类被转义，避免破坏帧格式 */
    private void send(SseEmitter emitter, Map<String, Object> payload) {
        try {
            emitter.send(SseEmitter.event().data(mapper.writeValueAsString(payload)));
        } catch (Exception e) {
            // 客户端断开后 send 必然失败，交给外层统一收尾
            throw new IllegalStateException(e);
        }
    }

    /** 从 {"choices":[{"delta":{"content":"我"}}]} 里取出 "我" */
    private String readDelta(String json) {
        try {
            JsonNode content = mapper.readTree(json)
                    .path("choices").path(0).path("delta").path("content");
            return content.isMissingNode() || content.isNull() ? null : content.asText();
        } catch (Exception e) {
            return null; // 有些厂商会插入心跳包，解析不了就跳过
        }
    }

    private HttpRequest buildRequest(ChatRequest req) throws Exception {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", props.getSystemPrompt()));

        List<ChatRequest.Msg> history = req.history() == null ? List.of() : req.history();
        int from = Math.max(0, history.size() - props.getMaxHistory());
        for (ChatRequest.Msg m : history.subList(from, history.size())) {
            if (m == null || m.content() == null || m.content().isBlank()) continue;
            String role = "assistant".equals(m.role()) ? "assistant" : "user";
            messages.add(Map.of("role", role, "content", m.content()));
        }
        messages.add(Map.of("role", "user", "content", req.content()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.getModel());
        body.put("stream", true);
        body.put("temperature", 0.7);
        body.put("messages", messages);

        String url = props.getBaseUrl().replaceAll("/+$", "") + "/chat/completions";

        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(props.getTimeoutSeconds()))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + props.getApiKey())
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(
                        mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
    }
}
