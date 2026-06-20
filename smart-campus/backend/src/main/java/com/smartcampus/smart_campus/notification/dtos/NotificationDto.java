package com.smartcampus.smart_campus.notification.dtos;

import com.smartcampus.smart_campus.notification.enums.NotificationType;

import java.time.LocalDateTime;

public class NotificationDto {

    public record NotificationResponse(
            Long notificationId,
            NotificationType type,
            String title,
            String message,
            boolean isRead,
            LocalDateTime createdAt
    ) {}

    public record UnreadCountResponse(
            long unreadCount
    ) {}
}
