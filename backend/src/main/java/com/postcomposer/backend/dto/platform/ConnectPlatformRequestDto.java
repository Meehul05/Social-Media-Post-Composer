package com.postcomposer.backend.dto.platform;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConnectPlatformRequestDto {

    @NotBlank(message = "Account handle is required")
    private String handle;

    private String authorizationCode;

    private String accessToken;

    private String refreshToken;
}
