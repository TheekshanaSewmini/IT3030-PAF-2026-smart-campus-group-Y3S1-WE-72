package com.smartcampus.smart_campus.repo;

import com.smartcampus.smart_campus.entities.ForgotPassword;
import com.smartcampus.smart_campus.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForgotPasswordRepository extends JpaRepository<ForgotPassword, Integer> {


    Optional<ForgotPassword> findByOtpAndUser(Integer otp, User user);


    Optional<ForgotPassword> findByUser(User user);

    void deleteByUser(User user);
}


