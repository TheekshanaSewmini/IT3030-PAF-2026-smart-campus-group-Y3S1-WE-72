package com.smartcampus.smart_campus.booking.repo;

import com.smartcampus.smart_campus.booking.entities.Booking;
import com.smartcampus.smart_campus.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByBookedByUserIdOrderByCreatedAtDesc(Long userId);

    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);

    List<Booking> findByFacilityAssetIdAndBookingDateAndStatusInOrderByStartTimeAsc(
            Long facilityAssetId,
            LocalDate bookingDate,
            Collection<BookingStatus> statuses
    );

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.facilityAsset.id = :facilityAssetId
              AND b.bookingDate = :bookingDate
              AND b.status IN :statuses
              AND (:startTime < b.endTime AND :endTime > b.startTime)
            """)
    List<Booking> findConflicts(
            @Param("facilityAssetId") Long facilityAssetId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("statuses") Collection<BookingStatus> statuses
    );

    @Query("""
            SELECT DISTINCT b.facilityAsset.id
            FROM Booking b
            WHERE b.facilityAsset IS NOT NULL
              AND b.bookingDate = :bookingDate
              AND b.status IN :statuses
              AND (:startTime < b.endTime AND :endTime > b.startTime)
            """)
    List<Long> findBusyFacilityAssetIds(
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("statuses") Collection<BookingStatus> statuses
    );
    List<Booking> findByFacilityAssetId(Long facilityAssetId);

    void deleteByFacilityAssetId(Long facilityAssetId);

    void deleteByBookedByUserId(Long userId);
}
