package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.platform.ConnectPlatformRequestDto;
import com.postcomposer.backend.dto.platform.PlatformAccountDto;
import com.postcomposer.backend.entity.PlatformAccount;
import com.postcomposer.backend.entity.PlatformType;
import com.postcomposer.backend.entity.User;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.ResourceNotFoundException;
import com.postcomposer.backend.repository.PlatformAccountRepository;
import com.postcomposer.backend.repository.UserRepository;
import com.postcomposer.backend.security.AesGcmCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Manages Instagram and LinkedIn account connections for Settings.jsx.
 * Encrypts OAuth access and refresh tokens at rest using AES-256-GCM.
 */
@Service
@RequiredArgsConstructor
public class PlatformAccountService {

    private final PlatformAccountRepository platformAccountRepository;
    private final UserRepository userRepository;
    private final AesGcmCryptoService cryptoService;
    private final AuditLogService auditLogService;

    @Value("${app.platforms.sandbox-mode:true}")
    private boolean sandboxMode;

    @Transactional(readOnly = true)
    public List<PlatformAccountDto> getUserPlatformAccounts(Long userId) {
        Map<PlatformType, PlatformAccount> existing = platformAccountRepository
                .findByUserIdOrderByPlatformAsc(userId)
                .stream()
                .collect(Collectors.toMap(PlatformAccount::getPlatform, Function.identity()));

        List<PlatformAccountDto> result = new ArrayList<>();
        for (PlatformType type : PlatformType.values()) {
            PlatformAccount acc = existing.get(type);
            if (acc != null) {
                result.add(toDto(acc));
            } else {
                result.add(PlatformAccountDto.builder()
                        .platform(type.name())
                        .handle(type == PlatformType.INSTAGRAM ? "@yourhandle" : "Not connected")
                        .connected(false)
                        .sandboxMode(sandboxMode)
                        .build());
            }
        }
        return result;
    }

    @Transactional
    public PlatformAccountDto connectPlatform(Long userId, String platformName, ConnectPlatformRequestDto request) {
        PlatformType platformType = parsePlatform(platformName);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String rawAccessToken = StringUtils.hasText(request.getAccessToken())
                ? request.getAccessToken()
                : "sandbox-oauth-token-" + UUID.randomUUID();

        String encryptedAccess = cryptoService.encrypt(rawAccessToken);
        String encryptedRefresh = StringUtils.hasText(request.getRefreshToken())
                ? cryptoService.encrypt(request.getRefreshToken())
                : null;

        PlatformAccount account = platformAccountRepository
                .findByUserIdAndPlatform(userId, platformType)
                .orElseGet(() -> PlatformAccount.builder()
                        .user(user)
                        .platform(platformType)
                        .build());

        account.setHandle(request.getHandle().trim());
        account.setEncryptedAccessToken(encryptedAccess);
        account.setEncryptedRefreshToken(encryptedRefresh);
        account.setConnected(true);
        account.setSandboxAccount(sandboxMode);
        account.setTokenExpiresAt(Instant.now().plusSeconds(5184000)); // 60 days

        PlatformAccount saved = platformAccountRepository.save(account);
        auditLogService.log(userId, "PLATFORM_CONNECTED", "PlatformAccount",
                platformType.name(), "Connected handle " + saved.getHandle());
        return toDto(saved);
    }

    @Transactional
    public void disconnectPlatform(Long userId, String platformOrId) {
        PlatformAccount account;
        try {
            Long id = Long.parseLong(platformOrId);
            account = platformAccountRepository.findByIdAndUserId(id, userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Platform account not found"));
        } catch (NumberFormatException e) {
            PlatformType type = parsePlatform(platformOrId);
            account = platformAccountRepository.findByUserIdAndPlatform(userId, type)
                    .orElseThrow(() -> new ResourceNotFoundException("Platform account not found for " + type));
        }

        account.setConnected(false);
        account.setEncryptedAccessToken(cryptoService.encrypt("revoked"));
        account.setEncryptedRefreshToken(null);
        platformAccountRepository.save(account);

        auditLogService.log(userId, "PLATFORM_DISCONNECTED", "PlatformAccount",
                account.getPlatform().name(), "Disconnected account");
    }

    private PlatformType parsePlatform(String value) {
        try {
            return PlatformType.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Unsupported platform: " + value + ". Allowed: INSTAGRAM, LINKEDIN");
        }
    }

    private PlatformAccountDto toDto(PlatformAccount account) {
        return PlatformAccountDto.builder()
                .id(account.getId())
                .platform(account.getPlatform().name())
                .handle(account.getHandle())
                .connected(account.isConnected())
                .sandboxMode(account.isSandboxAccount())
                .updatedAt(account.getUpdatedAt().toString())
                .build();
    }
}
