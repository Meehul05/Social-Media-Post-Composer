package com.postcomposer.backend.dto.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Matches the fields sent by the PostComposer frontend, including optional platform-specific content overrides.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostRequestDto {

    @NotBlank(message = "Post content cannot be empty")
    @Size(max = 3000, message = "Post content cannot exceed 3000 characters")
    private String post;

    @Size(max = 2200, message = "Instagram custom content cannot exceed 2200 characters")
    private String instagramContent;

    @Size(max = 3000, message = "LinkedIn custom content cannot exceed 3000 characters")
    private String linkedinContent;

    private boolean instagram;

    private boolean linkedin;

    private boolean hasImages;

    private String date;

    private String time;

    private String timezone;

    private List<Long> mediaIds;

    private List<String> mediaUrls;
}
