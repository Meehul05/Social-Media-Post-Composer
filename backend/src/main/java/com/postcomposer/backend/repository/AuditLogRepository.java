package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
}
