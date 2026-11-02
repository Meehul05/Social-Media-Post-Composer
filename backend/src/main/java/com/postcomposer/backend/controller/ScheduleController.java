package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.post.MoveScheduleRequestDto;
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
@RequestMapping("/api/v1/scheduled-posts")
@RequiredArgsConstructor
@Tag(name = "Scheduling", description = "Calendar scheduling, editing, and drag-and-drop rescheduling endpoints")
public class ScheduleController {

    private final PostService postService;

    @GetMapping
    @Operation(summary = "Retrieve all scheduled posts for the authenticated user")
    public ResponseEntity<List<PostResponseDto>> getScheduledPosts(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(postService.getScheduledPosts(principal.getId()));
    }

    @PostMapping
    @Operation(summary = "Schedule a post for a future date and time")
    public ResponseEntity<PostResponseDto> schedulePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.schedulePost(principal.getId(), request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing scheduled post's content, platforms, or schedule date/time")
    public ResponseEntity<PostResponseDto> updateScheduledPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.ok(postService.updateScheduledPost(principal.getId(), id, request));
    }

    @PutMapping("/{id}/move")
    @Operation(summary = "Move a scheduled post to a new date on the Calendar")
    public ResponseEntity<PostResponseDto> moveScheduledPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody MoveScheduleRequestDto request
    ) {
        return ResponseEntity.ok(postService.moveScheduledPost(principal.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel and remove a scheduled post")
    public ResponseEntity<Map<String, String>> cancelScheduledPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        postService.deletePostOrDraft(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Scheduled post cancelled"));
    }
}
