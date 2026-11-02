package com.example.aihealth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ai 心理健康平台启动类。
 *
 * <p>位于 com.example.aihealth 根包，Spring Boot 会自动扫描本包及其所有子包
 * （controller / service / mapper / config 等），因此业务代码都必须建在此包之下。</p>
 */
@SpringBootApplication
public class AiHealthApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiHealthApplication.class, args);
    }
}
