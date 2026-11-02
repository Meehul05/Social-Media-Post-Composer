package com.postcomposer.backend.dto.ai;

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
public class AiCaptionRequestDto {

    @NotBlank(message = "Topic or prompt is required")
    @Size(max = 1000, message = "Prompt must be at most 1000 characters")
    private String prompt;

    private boolean instagram;
    private boolean linkedin;
    private String tone;
}
