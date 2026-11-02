package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.media.MediaFileDto;
import com.postcomposer.backend.security.UserPrincipal;
import com.postcomposer.backend.service.MediaStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Media upload, validation, and library management")
public class MediaController {

    private final MediaStorageService mediaStorageService;

    @GetMapping
    @Operation(summary = "List uploaded media files belonging to the authenticated user")
    public ResponseEntity<List<MediaFileDto>> listMedia(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(mediaStorageService.getUserMedia(principal.getId()));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload an image attachment (JPEG/JPG/PNG up to 10MB)")
    public ResponseEntity<MediaFileDto> uploadMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mediaStorageService.uploadMedia(principal.getId(), file));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a media file belonging to the authenticated user")
    public ResponseEntity<Map<String, String>> deleteMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        mediaStorageService.deleteMedia(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Media deleted successfully"));
    }
}
