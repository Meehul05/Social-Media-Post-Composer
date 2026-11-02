package com.postcomposer.backend.service;

import com.postcomposer.backend.entity.IdempotencyRecord;
import com.postcomposer.backend.repository.IdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private IdempotencyRecordRepository repository;

    private IdempotencyService idempotencyService;

    @BeforeEach
    void setUp() {
        idempotencyService = new IdempotencyService(repository);
    }

    @Test
    void acquiresLockWhenKeyDoesNotExist() {
        when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.empty());
        boolean acquired = idempotencyService.tryAcquireLock("key-1", "PUBLISH_POST", 42L);
        assertThat(acquired).isTrue();
        verify(repository, times(1)).save(any(IdempotencyRecord.class));
    }

    @Test
    void rejectsLockWhenOperationAlreadyCompleted() {
        IdempotencyRecord completed = IdempotencyRecord.builder()
                .idempotencyKey("key-1")
                .status("COMPLETED")
                .build();
        when(repository.findByIdempotencyKey("key-1")).thenReturn(Optional.of(completed));

        boolean acquired = idempotencyService.tryAcquireLock("key-1", "PUBLISH_POST", 42L);
        assertThat(acquired).isFalse();
        verify(repository, never()).save(any());
    }
}
