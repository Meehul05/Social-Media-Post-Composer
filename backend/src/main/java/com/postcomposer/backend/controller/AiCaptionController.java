package com.postcomposer.backend.controller;

import com.postcomposer.backend.dto.ai.AiCaptionRequestDto;
import com.postcomposer.backend.dto.ai.AiCaptionResponseDto;
import com.postcomposer.backend.service.AiCaptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI Assistant", description = "Server-side AI caption generation")
public class AiCaptionController {

    private final AiCaptionService aiCaptionService;

    @PostMapping("/caption")
    @Operation(summary = "Generate platform-tailored social media caption")
    public ResponseEntity<AiCaptionResponseDto> generateCaption(@Valid @RequestBody AiCaptionRequestDto request) {
        return ResponseEntity.ok(aiCaptionService.generateCaption(request));
    }
}
