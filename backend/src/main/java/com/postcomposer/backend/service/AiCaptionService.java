package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.ai.AiCaptionRequestDto;
import com.postcomposer.backend.dto.ai.AiCaptionResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Server-side AI caption generation service.
 * Never exposes API keys to the frontend.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiCaptionService {

    @Value("${app.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini-model:gemini-3.8-flash}")
    private String geminiModel;

    private final RestTemplate restTemplate = new RestTemplate();

    public AiCaptionResponseDto generateCaption(AiCaptionRequestDto request) {
        String platforms = (request.isInstagram() && request.isLinkedin())
                ? "Instagram and LinkedIn"
                : (request.isLinkedin() ? "LinkedIn" : "Instagram");

        if (StringUtils.hasText(geminiApiKey)) {
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + geminiModel + ":generateContent?key=" + geminiApiKey;

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                String systemPrompt = "Write an engaging social media post for " + platforms
                        + ". Keep it concise, authentic, and under 2000 characters. Topic: " + request.getPrompt();

                Map<String, Object> body = Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", systemPrompt))))
                );

                ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
                    if (candidates != null && !candidates.isEmpty()) {
                        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                        String text = String.valueOf(parts.get(0).get("text")).trim();
                        return AiCaptionResponseDto.builder()
                                .caption(text)
                                .provider(geminiModel)
                                .build();
                    }
                }
            } catch (Exception e) {
                log.warn("External AI provider call failed, using deterministic studio template: {}", e.getMessage());
            }
        }

        String fallbackCaption = String.format(
                "🚀 %s\n\nSharing key insights with our %s community today. What are your thoughts on this? Drop a comment below! 👇 #SocialMediaStudio #Growth #Innovation",
                request.getPrompt().trim(),
                platforms
        );
        return AiCaptionResponseDto.builder()
                .caption(fallbackCaption)
                .provider("studio-template")
                .build();
    }
}
