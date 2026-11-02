package com.postcomposer.backend.dto.platform;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformAccountDto {
    private Long id;
    private String platform;
    private String handle;
    private boolean connected;
    private boolean sandboxMode;
    private String updatedAt;
}
