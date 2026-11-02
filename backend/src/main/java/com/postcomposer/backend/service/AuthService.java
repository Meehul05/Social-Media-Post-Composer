package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.auth.*;
import com.postcomposer.backend.entity.RefreshToken;
import com.postcomposer.backend.entity.Role;
import com.postcomposer.backend.entity.RoleName;
import com.postcomposer.backend.entity.User;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.ConflictException;
import com.postcomposer.backend.exception.ResourceNotFoundException;
import com.postcomposer.backend.exception.UnauthorizedException;
import com.postcomposer.backend.repository.RefreshTokenRepository;
import com.postcomposer.backend.repository.RoleRepository;
import com.postcomposer.backend.repository.UserRepository;
import com.postcomposer.backend.security.JwtTokenProvider;
import com.postcomposer.backend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("An account with this email already exists");
        }

        Role userRole = roleRepository.findByName(RoleName.ROLE_USER)
                .orElseGet(() -> roleRepository.save(Role.builder().name(RoleName.ROLE_USER).build()));

        User user = User.builder()
                .email(normalizedEmail)
                .displayName(request.getDisplayName().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .timezone(StringUtils.hasText(request.getTimezone()) ? request.getTimezone() : "UTC")
                .active(true)
                .roles(Set.of(userRole))
                .build();

        User saved = userRepository.save(user);
        auditLogService.log(saved.getId(), "USER_REGISTERED", "User", String.valueOf(saved.getId()), "User registered");

        return issueTokensForUser(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

        auditLogService.log(user.getId(), "USER_LOGIN", "User", String.valueOf(user.getId()), "Successful login");
        return issueTokensForUser(user);
    }

    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String incomingHash = jwtTokenProvider.hashRefreshToken(request.getRefreshToken());
        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(incomingHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (storedToken.isRevoked() || storedToken.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.revokeAllActiveTokensForUser(storedToken.getUser().getId());
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        // Rotate refresh token
        String newRawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String newHash = jwtTokenProvider.hashRefreshToken(newRawRefreshToken);

        storedToken.setRevoked(true);
        storedToken.setReplacedByHash(newHash);
        refreshTokenRepository.save(storedToken);

        User user = storedToken.getUser();
        RefreshToken rotatedToken = RefreshToken.builder()
                .user(user)
                .tokenHash(newHash)
                .expiresAt(Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpirationMs()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(rotatedToken);

        UserPrincipal principal = UserPrincipal.create(user);
        String accessToken = jwtTokenProvider.generateAccessToken(principal);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .user(toUserProfileDto(user))
                .build();
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllActiveTokensForUser(userId);
        auditLogService.log(userId, "USER_LOGOUT", "User", String.valueOf(userId), "Revoked active refresh tokens");
    }

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toUserProfileDto(user);
    }

    @Transactional
    public UserProfileDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (!user.getEmail().equalsIgnoreCase(normalizedEmail) && userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("Email address is already in use");
        }

        user.setDisplayName(request.getDisplayName().trim());
        user.setEmail(normalizedEmail);
        if (StringUtils.hasText(request.getTimezone())) {
            user.setTimezone(request.getTimezone());
        }

        User saved = userRepository.save(user);
        auditLogService.log(userId, "USER_PROFILE_UPDATED", "User", String.valueOf(userId), "Updated display name / email");
        return toUserProfileDto(saved);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllActiveTokensForUser(userId);
        auditLogService.log(userId, "USER_PASSWORD_CHANGED", "User", String.valueOf(userId), "Password changed and tokens revoked");
    }

    private AuthResponse issueTokensForUser(User user) {
        UserPrincipal principal = UserPrincipal.create(user);
        String accessToken = jwtTokenProvider.generateAccessToken(principal);
        String rawRefreshToken = jwtTokenProvider.generateRawRefreshToken();
        String refreshHash = jwtTokenProvider.hashRefreshToken(rawRefreshToken);

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(refreshHash)
                .expiresAt(Instant.now().plusMillis(jwtTokenProvider.getRefreshTokenExpirationMs()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getAccessTokenExpirationMs())
                .user(toUserProfileDto(user))
                .build();
    }

    public UserProfileDto toUserProfileDto(User user) {
        return UserProfileDto.builder()
                .id(user.getId())
                .displayName(user.getDisplayName())
                .email(user.getEmail())
                .timezone(user.getTimezone())
                .roles(user.getRoles().stream().map(r -> r.getName().name()).collect(Collectors.toSet()))
                .build();
    }
}
