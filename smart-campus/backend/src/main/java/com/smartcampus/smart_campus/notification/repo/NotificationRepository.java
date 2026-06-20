package com.smartcampus.smart_campus.notification.repo;

import com.smartcampus.smart_campus.notification.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);

    long countByUserUserIdAndReadFalse(Long userId);

    Optional<Notification> findByNotificationIdAndUserUserId(Long notificationId, Long userId);

    void deleteByUserUserId(Long userId);
}
