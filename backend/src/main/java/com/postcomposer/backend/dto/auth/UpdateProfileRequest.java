package com.postcomposer.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 120)
    private String displayName;

    @NotBlank(message = "Email address is required")
    @Email
    private String email;

    private String timezone;
}
