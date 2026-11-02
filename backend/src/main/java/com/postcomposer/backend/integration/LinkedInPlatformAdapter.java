package com.postcomposer.backend.integration;

import com.postcomposer.backend.entity.PlatformType;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.PlatformIntegrationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * LinkedIn UGC Posts API Adapter.
 * Supports explicit Sandbox Mode for development/testing and strict Official LinkedIn API mode in production.
 */
@Component
@Slf4j
public class LinkedInPlatformAdapter implements SocialPlatformAdapter {

    private static final int MAX_CHARS = 3000;
    private static final int MAX_IMAGES = 9;

    private final boolean sandboxMode;
    private final String apiBaseUrl;
    private final RestTemplate restTemplate = new RestTemplate();

    public LinkedInPlatformAdapter(
            @Value("${app.platforms.sandbox-mode:true}") boolean sandboxMode,
            @Value("${app.platforms.linkedin.api-base-url:https://api.linkedin.com/v2}") String apiBaseUrl
    ) {
        this.sandboxMode = sandboxMode;
        this.apiBaseUrl = apiBaseUrl;
    }

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.LINKEDIN;
    }

    @Override
    public int getMaxCharacterLimit() {
        return MAX_CHARS;
    }

    @Override
    public int getMaxMediaCount() {
        return MAX_IMAGES;
    }

    @Override
    public void validateContent(String content, int mediaCount) {
        if (!StringUtils.hasText(content)) {
            throw new BadRequestException("LinkedIn post content cannot be empty");
        }
        if (content.length() > MAX_CHARS) {
            throw new BadRequestException("LinkedIn post exceeds 3000 character limit");
        }
    }

    @Override
    public PlatformPublishResult publish(
            String decryptedAccessToken,
            String accountHandle,
            String content,
            List<String> mediaUrls
    ) {
        validateContent(content, mediaUrls != null ? mediaUrls.size() : 0);

        if (sandboxMode) {
            String sandboxId = "urn:li:share:sandbox_" + UUID.randomUUID().toString().substring(0, 12);
            log.info("[SANDBOX MODE] Simulated LinkedIn UGC API publish for {} -> {}", accountHandle, sandboxId);
            return PlatformPublishResult.builder()
                    .success(true)
                    .externalPostId(sandboxId)
                    .sandboxSimulated(true)
                    .build();
        }

        if (!StringUtils.hasText(decryptedAccessToken) || decryptedAccessToken.startsWith("sandbox-")) {
            throw new PlatformIntegrationException(
                    "LinkedIn production publishing requires a valid LinkedIn OAuth 2.0 access token. Sandbox fallback is disabled in production."
            );
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(decryptedAccessToken);
            headers.set("X-Restli-Protocol-Version", "2.0.0");

            Map<String, Object> payload = Map.of(
                    "author", accountHandle,
                    "lifecycleState", "PUBLISHED",
                    "specificContent", Map.of(
                            "com.linkedin.ugc.ShareContent", Map.of(
                                    "shareCommentary", Map.of("text", content),
                                    "shareMediaCategory", "NONE"
                            )
                    ),
                    "visibility", Map.of("com.linkedin.ugc.MemberNetworkVisibility", "PUBLIC")
            );

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    apiBaseUrl + "/ugcPosts",
                    new HttpEntity<>(payload, headers),
                    Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().containsKey("id")) {
                return PlatformPublishResult.builder()
                        .success(true)
                        .externalPostId(String.valueOf(response.getBody().get("id")))
                        .sandboxSimulated(false)
                        .build();
            }
            throw new PlatformIntegrationException("LinkedIn UGC API did not confirm publication");
        } catch (Exception ex) {
            log.error("LinkedIn UGC API publication failed for handle {}", accountHandle, ex);
            return PlatformPublishResult.builder()
                    .success(false)
                    .sandboxSimulated(false)
                    .errorMessage(ex.getMessage())
                    .build();
        }
    }
}
