package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.post.PostRequestDto;
import com.postcomposer.backend.dto.post.PostResponseDto;
import com.postcomposer.backend.security.UserPrincipal;
import com.postcomposer.backend.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/drafts")
@RequiredArgsConstructor
@Tag(name = "Drafts", description = "Draft management endpoints for Drafts.jsx and Compose.jsx")
public class DraftController {

    private final PostService postService;

    @GetMapping
    @Operation(summary = "Retrieve all saved drafts for the authenticated user")
    public ResponseEntity<List<PostResponseDto>> getDrafts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(postService.getDrafts(principal.getId()));
    }

    @PostMapping
    @Operation(summary = "Save a new post draft")
    public ResponseEntity<PostResponseDto> createDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.saveDraft(principal.getId(), request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing draft")
    public ResponseEntity<PostResponseDto> updateDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.ok(postService.updateDraft(principal.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a draft by ID")
    public ResponseEntity<Map<String, String>> deleteDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        postService.deletePostOrDraft(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Draft deleted successfully"));
    }
}
