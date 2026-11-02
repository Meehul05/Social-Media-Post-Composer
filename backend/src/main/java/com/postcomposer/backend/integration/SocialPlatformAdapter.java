package com.postcomposer.backend.integration;

import com.postcomposer.backend.entity.PlatformType;

import java.util.List;

/**
 * Adapter contract for external social media platforms (Instagram Graph API, LinkedIn UGC API).
 */
public interface SocialPlatformAdapter {

    PlatformType getPlatformType();

    int getMaxCharacterLimit();

    int getMaxMediaCount();

    void validateContent(String content, int mediaCount);

    PlatformPublishResult publish(String decryptedAccessToken, String accountHandle, String content, List<String> mediaUrls);
}
