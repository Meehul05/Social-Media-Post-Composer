package com.postcomposer.backend.service;

import com.postcomposer.backend.entity.AuditLog;
import com.postcomposer.backend.repository.AuditLogRepository;
import com.postcomposer.backend.security.CorrelationIdFilter;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(Long userId, String action, String entityType, String entityId, String details) {
        AuditLog logEntry = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .correlationId(MDC.get(CorrelationIdFilter.CORRELATION_ID_KEY))
                .build();
        auditLogRepository.save(logEntry);
    }
}
