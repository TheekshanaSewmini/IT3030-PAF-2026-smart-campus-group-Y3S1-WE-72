package com.smartcampus.smart_campus.dtos;

import com.smartcampus.smart_campus.enums.AuthProvider;
import com.smartcampus.smart_campus.enums.Role;
import com.smartcampus.smart_campus.enums.Semester;
import com.smartcampus.smart_campus.enums.Year;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class UserDto {

    public record RegisterRequest(
            @NotBlank(message = "First name is required")
            String firstname,

            @NotBlank(message = "Last name is required")
            String lastName,

            @NotBlank(message = "Email is required")
            @Email(message = "Please provide a valid email")
            String email,

            @NotBlank(message = "Temp email is required")
            String tempEmail,

            @NotBlank(message = "Phone number is required")
            String phoneNumber,

            @NotNull(message = "Role is required")
            Role role,

            @NotNull(message = "Year is required")
            Year year,

            @NotNull(message = "Semester is required")
            Semester semester,

            @NotBlank(message = "Password is required")
            String password
    ) {}

    public record ChangePassword(
            String password,
            String repeatPassword
    ) {}

    public record DeleteAccountDto(
            String currentPassword
    ) {}

    public record DeleteAccountForgotRequest(
            @NotBlank(message = "Email is required")
            String email
    ) {}

    public record DeleteAccountForgotVerifyDto(
            @NotBlank(message = "OTP is required")
            String otp
    ) {}

    public record UpdateEmailDto(
            @NotBlank(message = "Email cannot be blank")
            @Email(message = "Provide a valid email")
            String newEmail
    ) {}

    public record UpdateNameDto(
            @NotBlank(message = "Name cannot be blank")
            String name,
            String lastName
    ) {}

    public record UpdatePasswordDto(
            @NotBlank(message = "Current password is required")
            String currentPassword,

            @NotBlank(message = "New password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String newPassword,

            @NotBlank(message = "Confirm password is required")
            String confirmPassword
    ) {}

    public record UpdateProfileDetailsDto(
            String phoneNumber,
            Year year,
            Semester semester
    ) {}

    public record UserHomeDto(
            String welcomeMessage,
            int notifications,
            int tasks
    ) {}

    public record UserProfileDto(
            Long id,
            String name,
            String email,
            String lastName,
            Role role,
            AuthProvider provider,
            String phoneNumber,
            String tempEmail,
            String profileImageUrl,
            String coverImageUrl,
            Year year,
            Semester semester
    ) {}

    public record VerifyCodeDto(
            @NotBlank(message = "Verification code is required")
            String verifyCode
    ) {}
}

