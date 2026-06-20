package com.smartcampus.smart_campus.service;

import com.smartcampus.smart_campus.dtos.UserDto;
import com.smartcampus.smart_campus.entities.User;

public interface UserProfileService {

    // Profile
    UserDto.UserProfileDto getProfile(Long userId);

    UserDto.UserHomeDto getUserHome(Long userId);

    User getCurrentUser(String email);

    // Name
    UserDto.UpdateNameDto updateName(User user, UserDto.UpdateNameDto dto);

    UserDto.UserProfileDto updateProfileDetails(User user, UserDto.UpdateProfileDetailsDto dto);

    // Email
    UserDto.UpdateEmailDto updateEmail(User user, UserDto.UpdateEmailDto dto);

    void verifyNewEmail(User user, String otp);

    // Password
    void updatePassword(User user, UserDto.UpdatePasswordDto dto);

    // Account delete
    void deleteAccount(User user, UserDto.DeleteAccountDto dto);

    void requestDeletion(User user);

    void verifyAndDelete(User user, UserDto.DeleteAccountForgotVerifyDto dto);
}

