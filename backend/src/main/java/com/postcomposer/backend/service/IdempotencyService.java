package com.postcomposer.backend.service;

import com.postcomposer.backend.entity.IdempotencyRecord;
import com.postcomposer.backend.repository.IdempotencyRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRecordRepository;

    @Transactional
    public boolean tryAcquireLock(String idempotencyKey, String operationType, Long resourceId) {
        Optional<IdempotencyRecord> existing = idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            String status = existing.get().getStatus();
            if ("COMPLETED".equals(status) || "IN_PROGRESS".equals(status)) {
                return false;
            }
            IdempotencyRecord record = existing.get();
            record.setStatus("IN_PROGRESS");
            idempotencyRecordRepository.save(record);
            return true;
        }

        IdempotencyRecord record = IdempotencyRecord.builder()
                .idempotencyKey(idempotencyKey)
                .operationType(operationType)
                .resourceId(resourceId)
                .status("IN_PROGRESS")
                .build();
        idempotencyRecordRepository.save(record);
        return true;
    }

    @Transactional(readOnly = true)
    public boolean isAlreadyCompleted(String idempotencyKey) {
        return idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey)
                .map(r -> "COMPLETED".equals(r.getStatus()))
                .orElse(false);
    }

    @Transactional
    public void recordDirectCompletion(String idempotencyKey, String operationType, Long resourceId, String summary) {
        IdempotencyRecord record = idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> IdempotencyRecord.builder()
                        .idempotencyKey(idempotencyKey)
                        .operationType(operationType)
                        .resourceId(resourceId)
                        .build());
        record.setStatus("COMPLETED");
        record.setResponseSummary(summary);
        idempotencyRecordRepository.save(record);
    }

    @Transactional
    public void markCompleted(String idempotencyKey, String summary) {
        idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey).ifPresent(record -> {
            record.setStatus("COMPLETED");
            record.setResponseSummary(summary);
            idempotencyRecordRepository.save(record);
        });
    }

    @Transactional
    public void markFailed(String idempotencyKey, String errorSummary) {
        idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey).ifPresent(record -> {
            record.setStatus("FAILED");
            record.setResponseSummary(errorSummary);
            idempotencyRecordRepository.save(record);
        });
    }
}
