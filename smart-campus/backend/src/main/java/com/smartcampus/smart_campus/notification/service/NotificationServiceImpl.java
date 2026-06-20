package com.smartcampus.smart_campus.notification.service;

import com.smartcampus.smart_campus.booking.entities.Booking;
import com.smartcampus.smart_campus.booking.enums.BookingStatus;
import com.smartcampus.smart_campus.entities.User;
import com.smartcampus.smart_campus.enums.Role;
import com.smartcampus.smart_campus.notification.dtos.NotificationDto;
import com.smartcampus.smart_campus.notification.entities.Notification;
import com.smartcampus.smart_campus.notification.enums.NotificationType;
import com.smartcampus.smart_campus.notification.repo.NotificationRepository;
import com.smartcampus.smart_campus.repo.UserRepo;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepo userRepo;

    @Override
    public void createAdminNotificationForNewBooking(Booking booking) {
        if (booking == null || booking.getBookedBy() == null) {
            return;
        }

        if (booking.getBookedBy().getRole() != Role.USER) {
            return;
        }

        List<User> admins = userRepo.findByRole(Role.ADMIN);
        if (admins.isEmpty()) {
            return;
        }

        String facilityName = booking.getFacilityAsset() != null
                ? booking.getFacilityAsset().getName()
                : "Resource";

        String requester = booking.getBookedBy().getEmail();
        String message = String.format(
                "New booking request from %s for %s on %s at %s.",
                requester,
                facilityName,
                booking.getBookingDate(),
                booking.getStartTime()
        );

        List<Notification> adminNotifications = admins.stream()
                .map(admin -> Notification.builder()
                        .user(admin)
                        .type(NotificationType.BOOKING_REQUEST_CREATED)
                        .title("New Booking Request")
                        .message(message)
                        .read(false)
                        .build())
                .toList();

        notificationRepository.saveAll(adminNotifications);
    }

    @Override
    public void createBookingDecisionNotification(Booking booking, BookingStatus bookingStatus) {
        if (booking == null || booking.getBookedBy() == null) {
            return;
        }

        if (bookingStatus != BookingStatus.APPROVED && bookingStatus != BookingStatus.REJECTED) {
            return;
        }

        NotificationType type = bookingStatus == BookingStatus.APPROVED
                ? NotificationType.BOOKING_APPROVED
                : NotificationType.BOOKING_REJECTED;

        String title = bookingStatus == BookingStatus.APPROVED
                ? "Booking Approved"
                : "Booking Rejected";

        String facilityName = booking.getFacilityAsset() != null
                ? booking.getFacilityAsset().getName()
                : "Resource";

        String message = bookingStatus == BookingStatus.APPROVED
                ? String.format("Your booking for %s has been approved.", facilityName)
                : String.format("Your booking for %s has been rejected.", facilityName);

        Notification notification = Notification.builder()
                .user(booking.getBookedBy())
                .type(type)
                .title(title)
                .message(message)
                .read(false)
                .build();

        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public List<NotificationDto.NotificationResponse> getMyNotifications(User user) {
        validateUser(user);
        return notificationRepository.findByUserUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public long getUnreadCount(User user) {
        validateUser(user);
        return notificationRepository.countByUserUserIdAndReadFalse(user.getUserId());
    }

    @Override
    public void markAsRead(User user, Long notificationId) {
        validateUser(user);
        Notification notification = getOwnedNotification(user.getUserId(), notificationId);
        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Override
    public void markAllAsRead(User user) {
        validateUser(user);
        List<Notification> unreadNotifications =
                notificationRepository.findByUserUserIdAndReadFalseOrderByCreatedAtDesc(user.getUserId());

        if (unreadNotifications.isEmpty()) {
            return;
        }

        unreadNotifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(unreadNotifications);
    }

    @Override
    public void deleteNotification(User user, Long notificationId) {
        validateUser(user);
        Notification notification = getOwnedNotification(user.getUserId(), notificationId);
        notificationRepository.delete(notification);
    }

    @Override
    public void deleteByUserId(Long userId) {
        if (userId == null) {
            return;
        }
        notificationRepository.deleteByUserUserId(userId);
    }

    private Notification getOwnedNotification(Long userId, Long notificationId) {
        return notificationRepository.findByNotificationIdAndUserUserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }

    private void validateUser(User user) {
        if (user == null || user.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
    }

    private NotificationDto.NotificationResponse toResponse(Notification notification) {
        return new NotificationDto.NotificationResponse(
                notification.getNotificationId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
