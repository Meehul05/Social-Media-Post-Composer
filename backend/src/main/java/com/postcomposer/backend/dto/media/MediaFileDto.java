package com.postcomposer.backend.dto.media;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaFileDto {
    private Long id;
    private String originalFilename;
    private String contentType;
    private long fileSize;
    private String url;
    private String createdAt;
}
