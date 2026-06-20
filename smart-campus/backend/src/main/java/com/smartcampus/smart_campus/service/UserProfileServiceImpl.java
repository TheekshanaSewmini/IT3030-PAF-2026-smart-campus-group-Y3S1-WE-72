package com.smartcampus.smart_campus.service;

import com.smartcampus.smart_campus.booking.repo.BookingRepository;
import com.smartcampus.smart_campus.dtos.UserDto;
import com.smartcampus.smart_campus.entities.ForgotPassword;
import com.smartcampus.smart_campus.entities.User;
import com.smartcampus.smart_campus.enums.AuthProvider;
import com.smartcampus.smart_campus.notification.repo.NotificationRepository;
import com.smartcampus.smart_campus.records.MailBody;
import com.smartcampus.smart_campus.repo.ForgotPasswordRepository;
import com.smartcampus.smart_campus.repo.UserRepo;
import com.smartcampus.smart_campus.utils.EmailUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Date;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final ForgotPasswordRepository forgotPasswordRepository;
    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final EmailUtils emailUtils;

    // Current user
    @Override
    public User getCurrentUser(String email) {
        return userRepo.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Delete account
    @Transactional
    @Override
    public void deleteAccount(User user, UserDto.DeleteAccountDto dto) {
        if (requiresPasswordForDelete(user)) {
            String currentPassword = dto != null ? dto.currentPassword() : null;

            if (currentPassword == null || currentPassword.isBlank()) {
                throw new RuntimeException("Current password is required");
            }

            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new RuntimeException("Current password is incorrect");
            }
        }

        deleteUserWithDependencies(user);
    }

    // Request delete OTP
    @Transactional
    @Override
    public void requestDeletion(User user) {

        int otp = new Random().nextInt(900000) + 100000;
        Date expiration = new Date(System.currentTimeMillis() + 10 * 60 * 1000);

        ForgotPassword fp = forgotPasswordRepository.findByUser(user)
                .orElse(new ForgotPassword());

        fp.setUser(user);
        fp.setOtp(otp);
        fp.setExpirationTime(expiration);
        fp.setLastSentAt(new Date());

        forgotPasswordRepository.save(fp);

        emailUtils.sendMail(new MailBody(
                user.getEmail(),
                "OTP for Account Deletion",
                "Your OTP is: " + otp + " (valid for 10 minutes)"
        ));
    }

    // Verify and delete
    @Transactional
    @Override
    public void verifyAndDelete(User user, UserDto.DeleteAccountForgotVerifyDto dto) {

        ForgotPassword fp = forgotPasswordRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("OTP not requested"));

        if (!fp.getOtp().equals(Integer.parseInt(dto.otp()))) {
            throw new RuntimeException("Invalid OTP");
        }

        if (fp.getExpirationTime().before(new Date())) {
            throw new RuntimeException("OTP expired");
        }

        deleteUserWithDependencies(user);
    }

    // Update name
    @Transactional
    @Override
    public UserDto.UpdateNameDto updateName(User user, UserDto.UpdateNameDto dto) {

        user.setFirstname(dto.name());
        user.setLastName(dto.lastName());

        userRepo.save(user);

        return new UserDto.UpdateNameDto(
                user.getFirstname(),
                user.getLastName()
        );
    }

    @Transactional
    @Override
    public UserDto.UserProfileDto updateProfileDetails(User user, UserDto.UpdateProfileDetailsDto dto) {
        if (dto == null) {
            throw new RuntimeException("Profile data is required");
        }

        if (dto.phoneNumber() != null) {
            String updatedPhone = dto.phoneNumber().trim();
            if (updatedPhone.isBlank()) {
                throw new RuntimeException("Phone number cannot be blank");
            }

            Optional<User> existingPhoneOwner = userRepo.findByPhoneNumber(updatedPhone);
            if (existingPhoneOwner.isPresent()
                    && !existingPhoneOwner.get().getUserId().equals(user.getUserId())) {
                throw new RuntimeException("Phone number already in use");
            }

            user.setPhoneNumber(updatedPhone);
        }

        if (dto.year() != null) {
            user.setYear(dto.year());
        }

        if (dto.semester() != null) {
            user.setSemester(dto.semester());
        }

        return toUserProfileDto(userRepo.save(user));
    }

    // Update email
    @Transactional
    @Override
    public UserDto.UpdateEmailDto updateEmail(User user, UserDto.UpdateEmailDto dto) {

        String newEmail = dto.newEmail().trim();

        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "New email must be different from current email"
            );
        }

        Optional<User> existingUser = userRepo.findByEmailIgnoreCase(newEmail);
        if (existingUser.isPresent()
                && !existingUser.get().getUserId().equals(user.getUserId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        int otp = new Random().nextInt(900000) + 100000;

        user.setTempEmail(newEmail);
        user.setVerifyCode(String.valueOf(otp));
        user.setVerifyCodeExpiry(new Date(System.currentTimeMillis() + 5 * 60 * 1000));
        user.setLastOtpSentAt(new Date());

        userRepo.save(user);

        emailUtils.sendMail(new MailBody(
                newEmail,
                "Verify New Email",
                "Your OTP is: " + otp + " (valid for 5 minutes)"
        ));

        return new UserDto.UpdateEmailDto(newEmail);
    }

    // Verify new email
    @Transactional
    @Override
    public void verifyNewEmail(User user, String otp) {

        if (user.getVerifyCode() == null) {
            throw new RuntimeException("OTP not found");
        }

        if (!user.getVerifyCode().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (user.getVerifyCodeExpiry().before(new Date())) {
            throw new RuntimeException("OTP expired");
        }

        user.setEmail(user.getTempEmail());
        user.setTempEmail(null);
        user.setVerifyCode(null);
        user.setVerifyCodeExpiry(null);

        userRepo.save(user);
    }

    // Update password
    @Transactional
    @Override
    public void updatePassword(User user, UserDto.UpdatePasswordDto dto) {

        if (!passwordEncoder.matches(dto.currentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        if (!dto.newPassword().equals(dto.confirmPassword())) {
            throw new RuntimeException("Passwords do not match");
        }

        user.setPassword(passwordEncoder.encode(dto.newPassword()));
        userRepo.save(user);
    }

    // Home
    @Override
    public UserDto.UserHomeDto getUserHome(Long userId) {

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        int unreadNotifications = Math.toIntExact(
                notificationRepository.countByUserUserIdAndReadFalse(userId)
        );

        return new UserDto.UserHomeDto(
                "Welcome back, " + user.getFirstname() + "!",
                unreadNotifications,
                5
        );
    }

    // Profile
    @Override
    public UserDto.UserProfileDto getProfile(Long userId) {

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return toUserProfileDto(user);
    }

    private UserDto.UserProfileDto toUserProfileDto(User user) {
        return new UserDto.UserProfileDto(
                user.getUserId(),
                user.getFirstname(),
                user.getEmail(),
                user.getLastName(),
                user.getRole(),
                user.getProvider(),
                user.getPhoneNumber(),
                user.getTempEmail(),
                user.getImageUrl(),
                user.getCoverImageUrl(),
                user.getYear(),
                user.getSemester()
        );
    }

    private boolean requiresPasswordForDelete(User user) {
        AuthProvider provider = user.getProvider();
        return provider == null || provider == AuthProvider.LOCAL;
    }

    private void deleteUserWithDependencies(User user) {
        forgotPasswordRepository.deleteByUser(user);
        bookingRepository.deleteByBookedByUserId(user.getUserId());
        notificationRepository.deleteByUserUserId(user.getUserId());

        user.setRefreshToken(null);
        userRepo.save(user);
        userRepo.delete(user);
    }
}
