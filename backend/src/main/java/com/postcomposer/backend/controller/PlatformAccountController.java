package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.platform.ConnectPlatformRequestDto;
import com.postcomposer.backend.dto.platform.PlatformAccountDto;
import com.postcomposer.backend.security.UserPrincipal;
import com.postcomposer.backend.service.PlatformAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/platform-accounts")
@RequiredArgsConstructor
@Tag(name = "Platform Accounts", description = "Social media account connections with AES-GCM encrypted tokens")
public class PlatformAccountController {

    private final PlatformAccountService platformAccountService;

    @GetMapping
    @Operation(summary = "List Instagram and LinkedIn connection status for Settings.jsx")
    public ResponseEntity<List<PlatformAccountDto>> getPlatformAccounts(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(platformAccountService.getUserPlatformAccounts(principal.getId()));
    }

    @PostMapping("/{platform}/connect")
    @Operation(summary = "Connect or update an Instagram or LinkedIn account")
    public ResponseEntity<PlatformAccountDto> connectPlatform(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String platform,
            @Valid @RequestBody ConnectPlatformRequestDto request
    ) {
        return ResponseEntity.ok(platformAccountService.connectPlatform(principal.getId(), platform, request));
    }

    @DeleteMapping("/{platformOrId}")
    @Operation(summary = "Disconnect a platform account and revoke stored tokens")
    public ResponseEntity<Map<String, String>> disconnectPlatform(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String platformOrId
    ) {
        platformAccountService.disconnectPlatform(principal.getId(), platformOrId);
        return ResponseEntity.ok(Map.of("message", "Platform disconnected successfully"));
    }
}
