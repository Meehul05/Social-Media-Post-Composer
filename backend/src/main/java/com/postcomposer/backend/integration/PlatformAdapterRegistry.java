package com.postcomposer.backend.integration;

import com.postcomposer.backend.entity.PlatformType;
import com.postcomposer.backend.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class PlatformAdapterRegistry {

    private final Map<PlatformType, SocialPlatformAdapter> adapters = new EnumMap<>(PlatformType.class);

    public PlatformAdapterRegistry(List<SocialPlatformAdapter> adapterList) {
        for (SocialPlatformAdapter adapter : adapterList) {
            adapters.put(adapter.getPlatformType(), adapter);
        }
    }

    public SocialPlatformAdapter getAdapter(PlatformType type) {
        SocialPlatformAdapter adapter = adapters.get(type);
        if (adapter == null) {
            throw new BadRequestException("Unsupported social media platform: " + type);
        }
        return adapter;
    }
}
