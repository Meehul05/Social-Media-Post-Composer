package com.postcomposer.backend.dto.post;

import com.postcomposer.backend.entity.PostStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusPatchRequestDto {

    @NotNull(message = "Status is required")
    private PostStatus status;
}
