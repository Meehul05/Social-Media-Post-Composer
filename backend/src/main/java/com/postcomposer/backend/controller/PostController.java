package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.post.MoveScheduleRequestDto;
import com.postcomposer.backend.dto.post.PostRequestDto;
import com.postcomposer.backend.dto.post.PostResponseDto;
import com.postcomposer.backend.entity.PostStatus;
import com.postcomposer.backend.security.UserPrincipal;
import com.postcomposer.backend.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
@Tag(name = "Posts", description = "Post CRUD, immediate publishing, and scheduling")
public class PostController {

    private final PostService postService;

    @GetMapping
    @Operation(summary = "Retrieve paginated posts for the authenticated user")
    public ResponseEntity<Page<PostResponseDto>> getPosts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) PostStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        String[] sortParts = sort.split(",");
        Sort.Direction dir = (sortParts.length > 1 && "asc".equalsIgnoreCase(sortParts[1]))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(dir, sortParts[0]));
        return ResponseEntity.ok(postService.getPosts(principal.getId(), status, search, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Retrieve a specific post by ID")
    public ResponseEntity<PostResponseDto> getPostById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(postService.getPostById(principal.getId(), id));
    }

    @PostMapping
    @Operation(summary = "Create and immediately publish a post via Kafka event pipeline")
    public ResponseEntity<PostResponseDto> publishNow(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.publishNow(principal.getId(), request));
    }

    @PostMapping("/schedule")
    @Operation(summary = "Create and schedule a post for future publication")
    public ResponseEntity<PostResponseDto> scheduleNewPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PostRequestDto request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.schedulePost(principal.getId(), request));
    }

    @PutMapping("/{id}/schedule")
    @Operation(summary = "Reschedule an existing scheduled post (used by Calendar drag-and-drop)")
    public ResponseEntity<PostResponseDto> moveScheduledPost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody MoveScheduleRequestDto request
    ) {
        return ResponseEntity.ok(postService.moveScheduledPost(principal.getId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete or cancel a post")
    public ResponseEntity<Map<String, String>> deletePost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        postService.deletePostOrDraft(principal.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }
}
