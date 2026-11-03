package com.example.aihealth.dto;

import java.util.List;

/**
 * 流式对话请求体。
 * history 由前端传（只带最近若干条），后端不存会话，只负责拼上下文再转发。
 */
public record ChatRequest(String content, List<Msg> history) {

    /** role 取 user / assistant */
    public record Msg(String role, String content) {}
}
