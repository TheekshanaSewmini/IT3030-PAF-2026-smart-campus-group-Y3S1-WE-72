package com.smartcampus.smart_campus.notification.service;

import com.smartcampus.smart_campus.booking.entities.Booking;
import com.smartcampus.smart_campus.booking.enums.BookingStatus;
import com.smartcampus.smart_campus.entities.User;
import com.smartcampus.smart_campus.notification.dtos.NotificationDto;

import java.util.List;

public interface NotificationService {

    void createAdminNotificationForNewBooking(Booking booking);

    void createBookingDecisionNotification(Booking booking, BookingStatus bookingStatus);

    List<NotificationDto.NotificationResponse> getMyNotifications(User user);

    long getUnreadCount(User user);

    void markAsRead(User user, Long notificationId);

    void markAllAsRead(User user);

    void deleteNotification(User user, Long notificationId);

    void deleteByUserId(Long userId);
}
