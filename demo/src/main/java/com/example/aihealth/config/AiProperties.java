package com.example.aihealth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** 大模型连接配置，值来自 application.yml 的 ai.* */
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /** 接口前缀，OpenAI 兼容，不带结尾斜杠。OpenAI 填 https://api.openai.com/v1 */
    private String baseUrl = "https://api.deepseek.com/v1";
    private String apiKey = "";
    private String model = "deepseek-chat";
    /** 单次请求读流的超时（秒） */
    private int timeoutSeconds = 120;
    /** 最多带多少条历史进上下文，控 token */
    private int maxHistory = 12;

    private String systemPrompt =
            "你是一名温暖、专业的中文心理健康陪伴助手。"
            + "先共情再回应，语气平和，不评判、不说教。"
            + "不要做医学诊断；如果对方流露出自伤或伤人的念头，温和地建议其联系信任的人或拨打心理援助热线 12356。"
            + "回答控制在 200 字以内。";

    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }

    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public int getMaxHistory() { return maxHistory; }
    public void setMaxHistory(int maxHistory) { this.maxHistory = maxHistory; }

    public String getSystemPrompt() { return systemPrompt; }
    public void setSystemPrompt(String systemPrompt) { this.systemPrompt = systemPrompt; }
}
