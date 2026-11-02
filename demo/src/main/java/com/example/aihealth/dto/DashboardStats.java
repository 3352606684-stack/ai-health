package com.example.aihealth.dto;

import java.util.List;

/**
 * 数据分析首页的统计数据结构。
 * 目前由 DashboardController 返回演示数据，后续接入数据库后替换实现即可。
 */
public record DashboardStats(
        List<StatCard> statCards,
        List<String> dates,
        MoodTrend moodTrend,
        ConsultSummary consult,
        ActiveTrend activeTrend
) {

    /** 顶部统计卡片，key 用于前端匹配图标与颜色 */
    public record StatCard(String key, String label, String value, String extra) {
    }

    /** 情绪趋势：左轴评分、右轴记录数量 */
    public record MoodTrend(List<Double> score, List<Double> count) {
    }

    /** 咨询会话统计 */
    public record ConsultSummary(
            int total,
            double avgDuration,
            int activeUsers,
            List<Double> sessionCount,
            List<Double> participantCount
    ) {
    }

    /** 用户活跃趋势的四条曲线 */
    public record ActiveTrend(
            List<Double> active,
            List<Double> newUser,
            List<Double> logUser,
            List<Double> consultUser
    ) {
    }
}
