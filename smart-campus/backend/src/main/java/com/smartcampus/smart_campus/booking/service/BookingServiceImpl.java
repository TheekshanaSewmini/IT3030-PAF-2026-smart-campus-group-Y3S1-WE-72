package com.smartcampus.smart_campus.booking.service;

import com.smartcampus.smart_campus.booking.dtos.BookingDto;
import com.smartcampus.smart_campus.booking.entities.Booking;
import com.smartcampus.smart_campus.booking.enums.BookingStatus;
import com.smartcampus.smart_campus.booking.repo.BookingRepository;
import com.smartcampus.smart_campus.catalog.entities.FacilityAsset;
import com.smartcampus.smart_campus.catalog.enums.FacilityAssetStatus;
import com.smartcampus.smart_campus.catalog.repo.FacilityAssetRepository;
import com.smartcampus.smart_campus.entities.User;
import com.smartcampus.smart_campus.enums.Role;
import com.smartcampus.smart_campus.notification.service.NotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingServiceImpl implements BookingService {

    private static final Set<BookingStatus> BLOCKING_STATUSES = EnumSet.of(
            BookingStatus.PENDING,
            BookingStatus.APPROVED
    );

    private final BookingRepository bookingRepository;
    private final FacilityAssetRepository facilityAssetRepository;
    private final NotificationService notificationService;

    @Transactional
    @Override
    public BookingDto.BookingResponse createBooking(User user, BookingDto.CreateBookingRequest request) {
        validateTimeRange(request.bookingDate(), request.startTime(), request.endTime());

        FacilityAsset facilityAsset = getActiveFacilityAsset(request.facilityAssetId());
        validateWithinResourceWindow(facilityAsset, request.startTime(), request.endTime());
        validateConflicts(
                facilityAsset.getId(),
                request.bookingDate(),
                request.startTime(),
                request.endTime(),
                null,
                BLOCKING_STATUSES
        );

        Booking booking = Booking.builder()
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .facilityAsset(facilityAsset)
                .location(facilityAsset.getLocation())
                .bookingDate(request.bookingDate())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .status(BookingStatus.PENDING)
                .bookedBy(user)
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        notificationService.createAdminNotificationForNewBooking(savedBooking);
        return toResponse(savedBooking);
    }

    @Transactional
    @Override
    public BookingDto.BookingResponse updateBooking(User user, Long bookingId, BookingDto.UpdateBookingRequest request) {
        Booking booking = getBookingById(bookingId);

        validateOwnerOrAdmin(user, booking);
        validateMutableStatus(booking);
        validateTimeRange(request.bookingDate(), request.startTime(), request.endTime());

        FacilityAsset facilityAsset = getActiveFacilityAsset(request.facilityAssetId());
        validateWithinResourceWindow(facilityAsset, request.startTime(), request.endTime());
        validateConflicts(
                facilityAsset.getId(),
                request.bookingDate(),
                request.startTime(),
                request.endTime(),
                booking.getBookingId(),
                BLOCKING_STATUSES
        );

        booking.setTitle(request.title().trim());
        booking.setDescription(trimToNull(request.description()));
        booking.setFacilityAsset(facilityAsset);
        booking.setLocation(facilityAsset.getLocation());
        booking.setBookingDate(request.bookingDate());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setStatus(BookingStatus.PENDING);

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    @Override
    public void cancelBooking(User user, Long bookingId) {
        Booking booking = getBookingById(bookingId);
        validateOwnerOrAdmin(user, booking);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is already cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);
    }

    @Override
    public List<BookingDto.BookingResponse> getMyBookings(User user) {
        return bookingRepository.findByBookedByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<BookingDto.BookingResponse> getAllBookings() {
        return bookingRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<BookingDto.BookingResponse> getPendingBookings() {
        return bookingRepository.findByStatusOrderByCreatedAtDesc(BookingStatus.PENDING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<BookingDto.AvailableResourceResponse> getAvailableResources(LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        validateTimeRange(bookingDate, startTime, endTime);

        List<FacilityAsset> activeResources =
                facilityAssetRepository.findByStatusAndAvailableFromLessThanEqualAndAvailableToGreaterThanEqualOrderByNameAsc(
                        FacilityAssetStatus.ACTIVE,
                        startTime,
                        endTime
                );

        if (activeResources.isEmpty()) {
            return List.of();
        }

        Set<Long> busyIds = new HashSet<>(bookingRepository.findBusyFacilityAssetIds(
                bookingDate,
                startTime,
                endTime,
                BLOCKING_STATUSES
        ));

        return activeResources.stream()
                .filter(resource -> !busyIds.contains(resource.getId()))
                .map(resource -> new BookingDto.AvailableResourceResponse(
                        resource.getId(),
                        resource.getName(),
                        resource.getLocation(),
                        resource.getAvailableFrom(),
                        resource.getAvailableTo()
                ))
                .toList();
    }

    @Override
    public BookingDto.ResourceAvailabilityResponse getResourceAvailability(Long facilityAssetId, LocalDate bookingDate) {
        if (bookingDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking date is required");
        }

        FacilityAsset facilityAsset = getFacilityAssetById(facilityAssetId);
        List<BookingDto.BookedSlotResponse> bookedSlots =
                bookingRepository.findByFacilityAssetIdAndBookingDateAndStatusInOrderByStartTimeAsc(
                                facilityAssetId,
                                bookingDate,
                                BLOCKING_STATUSES
                        ).stream()
                        .map(booking -> new BookingDto.BookedSlotResponse(
                                booking.getBookingId(),
                                booking.getStartTime(),
                                booking.getEndTime(),
                                booking.getStatus()
                        ))
                        .toList();

        List<BookingDto.TimeSlot> slots = calculateAvailableSlots(
                facilityAsset,
                bookedSlots,
                bookingDate
        );

        return new BookingDto.ResourceAvailabilityResponse(
                facilityAsset.getId(),
                facilityAsset.getName(),
                facilityAsset.getLocation(),
                bookingDate,
                facilityAsset.getAvailableFrom(),
                facilityAsset.getAvailableTo(),
                slots
        );
    }

    private List<BookingDto.TimeSlot> calculateAvailableSlots(FacilityAsset asset, List<BookingDto.BookedSlotResponse> booked, LocalDate bookingDate) {
        java.util.ArrayList<BookingDto.TimeSlot> allSlots = new java.util.ArrayList<>();
        LocalTime current = asset.getAvailableFrom() != null ? asset.getAvailableFrom() : LocalTime.of(8, 0);
        LocalTime to = asset.getAvailableTo() != null ? asset.getAvailableTo() : LocalTime.of(17, 0);
        int duration = asset.getSlotDurationMinutes() != null ? asset.getSlotDurationMinutes() : 60;
        if (duration <= 0) duration = 60; // Safety fallback

        LocalTime now = LocalTime.now();
        boolean isToday = bookingDate.isEqual(LocalDate.now());

        while (current.plusMinutes(duration).isBefore(to) || current.plusMinutes(duration).equals(to)) {
            LocalTime next = current.plusMinutes(duration);
            
            // Skip past slots for today
            if (isToday && current.isBefore(now)) {
                current = next;
                continue;
            }
            final LocalTime start = current;
            final LocalTime end = next;

            boolean isOccupied = booked.stream().anyMatch(b -> 
                (start.isBefore(b.endTime()) && end.isAfter(b.startTime())) ||
                (start.equals(b.startTime()) || end.equals(b.endTime()))
            );

            if (!isOccupied) {
                allSlots.add(new BookingDto.TimeSlot(start, end));
            }
            current = next;
        }

        return allSlots;
    }

    @Transactional
    @Override
    public BookingDto.BookingResponse approveBooking(Long bookingId) {
        Booking booking = getBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be approved");
        }

        if (booking.getFacilityAsset() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking is not linked to a resource");
        }

        FacilityAsset facilityAsset = booking.getFacilityAsset();
        if (facilityAsset.getStatus() != FacilityAssetStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resource is not active for booking approval");
        }

        validateWithinResourceWindow(facilityAsset, booking.getStartTime(), booking.getEndTime());

        validateConflicts(
                facilityAsset.getId(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getBookingId(),
                EnumSet.of(BookingStatus.APPROVED)
        );

        booking.setStatus(BookingStatus.APPROVED);
        Booking savedBooking = bookingRepository.save(booking);
        notificationService.createBookingDecisionNotification(savedBooking, BookingStatus.APPROVED);
        return toResponse(savedBooking);
    }

    @Transactional
    @Override
    public BookingDto.BookingResponse rejectBooking(Long bookingId) {
        Booking booking = getBookingById(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending bookings can be rejected");
        }

        booking.setStatus(BookingStatus.REJECTED);
        Booking savedBooking = bookingRepository.save(booking);
        notificationService.createBookingDecisionNotification(savedBooking, BookingStatus.REJECTED);
        return toResponse(savedBooking);
    }

    private Booking getBookingById(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
    }

    private FacilityAsset getFacilityAssetById(Long facilityAssetId) {
        return facilityAssetRepository.findById(facilityAssetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found"));
    }

    private FacilityAsset getActiveFacilityAsset(Long facilityAssetId) {
        FacilityAsset facilityAsset = getFacilityAssetById(facilityAssetId);

        if (facilityAsset.getStatus() != FacilityAssetStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Resource is not active for booking");
        }

        return facilityAsset;
    }

    private void validateMutableStatus(Booking booking) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only pending bookings can be edited"
            );
        }
    }

    private void validateTimeRange(LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        if (bookingDate == null || startTime == null || endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking date, start time and end time are required");
        }

        if (!endTime.isAfter(startTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }

        if (bookingDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking date cannot be in the past");
        }

        if (bookingDate.isEqual(LocalDate.now()) && startTime.isBefore(LocalTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking start time cannot be in the past for today");
        }
    }

    private void validateWithinResourceWindow(FacilityAsset facilityAsset, LocalTime startTime, LocalTime endTime) {
        if (startTime.isBefore(facilityAsset.getAvailableFrom()) || endTime.isAfter(facilityAsset.getAvailableTo())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Requested time is outside resource availability window"
            );
        }
    }

    private void validateConflicts(Long facilityAssetId,
                                   LocalDate bookingDate,
                                   LocalTime startTime,
                                   LocalTime endTime,
                                   Long currentBookingId,
                                   Set<BookingStatus> statuses) {
        List<Booking> conflicts = bookingRepository.findConflicts(
                facilityAssetId,
                bookingDate,
                startTime,
                endTime,
                statuses
        );

        boolean hasConflicts = conflicts.stream()
                .anyMatch(booking -> !booking.getBookingId().equals(currentBookingId));

        if (hasConflicts) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Time slot is already booked for this resource");
        }
    }

    private void validateOwnerOrAdmin(User user, Booking booking) {
        boolean isOwner = booking.getBookedBy().getUserId().equals(user.getUserId());
        boolean isAdmin = user.getRole() == Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to modify this booking");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BookingDto.BookingResponse toResponse(Booking booking) {
        FacilityAsset facilityAsset = booking.getFacilityAsset();

        return new BookingDto.BookingResponse(
                booking.getBookingId(),
                booking.getTitle(),
                booking.getDescription(),
                facilityAsset != null ? facilityAsset.getId() : null,
                facilityAsset != null ? facilityAsset.getName() : null,
                facilityAsset != null ? facilityAsset.getLocation() : booking.getLocation(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getBookedBy().getUserId(),
                booking.getBookedBy().getEmail()
        );
    }
}
