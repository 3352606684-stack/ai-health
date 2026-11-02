package com.example.aihealth.controller;

import com.example.aihealth.dto.DashboardStats;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 数据分析首页接口。
 *
 * <p>当前返回演示数据，用于打通前后端链路；接入数据库后，
 * 只需把 {@link #stats()} 内部的构造换成真实查询结果，前端无需改动。</p>
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @GetMapping("/stats")
    public DashboardStats stats() {
        List<String> dates = List.of(
                "2026-01-05", "2026-01-08", "2026-01-11", "2026-01-14",
                "2026-01-17", "2026-01-20", "2026-01-23", "2026-01-26", "2026-01-29"
        );

        List<DashboardStats.StatCard> cards = List.of(
                new DashboardStats.StatCard("user", "总用户数", "3", "活跃用户：2"),
                new DashboardStats.StatCard("emotion", "情绪日志", "2", "今日新增：0"),
                new DashboardStats.StatCard("session", "咨询会话", "8", "今日新增：0"),
                new DashboardStats.StatCard("mood", "平均情绪", "7.5/10", "情绪健康指数")
        );

        DashboardStats.MoodTrend moodTrend = new DashboardStats.MoodTrend(
                List.of(0.2, 0.15, 0.2, 0.3, 0.25, 7.4, 0.3, 7.6, 0.35),
                List.of(0.03, 0.02, 0.04, 0.03, 0.02, 0.05, 0.04, 0.02, 0.03)
        );

        DashboardStats.ConsultSummary consult = new DashboardStats.ConsultSummary(
                8, 22815.6, 2,
                List.of(0.0, 0.0, 0.0, 0.0, 0.4, 0.0, 2.6, 3.0, 0.0),
                List.of(0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.5, 0.8, 0.0)
        );

        DashboardStats.ActiveTrend activeTrend = new DashboardStats.ActiveTrend(
                List.of(0.0, 0.05, 0.02, 0.03, 0.02, 0.04, 0.95, 0.1, 0.02),
                List.of(0.0, 0.02, 0.01, 0.02, 0.01, 0.02, 0.6, 0.15, 0.03),
                List.of(0.0, 0.0, 0.0, 0.01, 0.0, 0.0, 0.75, 0.05, 0.0),
                List.of(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.85, 0.2, 0.05)
        );

        return new DashboardStats(cards, dates, moodTrend, consult, activeTrend);
    }
}
