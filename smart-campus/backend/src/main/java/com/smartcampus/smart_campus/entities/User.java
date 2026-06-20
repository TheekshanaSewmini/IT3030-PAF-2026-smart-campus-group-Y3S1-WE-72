package com.smartcampus.smart_campus.entities;

import com.smartcampus.smart_campus.enums.AuthProvider;
import com.smartcampus.smart_campus.enums.Role;
import com.smartcampus.smart_campus.enums.Semester;
import com.smartcampus.smart_campus.enums.Year;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
@ToString(exclude = {"forgotPassword"})
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(nullable = false, length = 100)
    private String firstname;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    private String imageUrl;

    @Column(length = 500)
    private String coverImageUrl;

    @Column(length = 20)
    private String phoneNumber;

    @Column(nullable = false)
    private String password;

    @Column(length = 500)
    private String refreshToken;

    private String verifyCode;
    private Date verifyCodeExpiry;

    private Boolean isVerified = false;

    private Date lastOtpSentAt;
    private Integer otpResendCount;
    private Date otpFirstResendTime;
    private Date otpBlockUntil;




    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AuthProvider provider;

    @Column(length = 100)
    private String providerId;

    @OneToOne(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private ForgotPassword forgotPassword;

    @Column(unique = false)
    private String tempEmail;

    @Enumerated(EnumType.STRING)
    @Column(length = 50, nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Year year;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Semester semester;

    @Override
    @JsonIgnore
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    @JsonIgnore
    public String getUsername() {
        return email;
    }

    @Override
    @JsonIgnore
    public @Nullable String getPassword() {
        return password;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    @JsonIgnore
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isVerified;
    }
}
