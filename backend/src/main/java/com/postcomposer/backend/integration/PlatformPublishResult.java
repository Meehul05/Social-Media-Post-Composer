package com.postcomposer.backend.integration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformPublishResult {
    private boolean success;
    private String externalPostId;
    private boolean sandboxSimulated;
    private String errorMessage;
}
