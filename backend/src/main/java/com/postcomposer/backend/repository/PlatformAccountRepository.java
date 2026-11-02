package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.PlatformAccount;
import com.postcomposer.backend.entity.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformAccountRepository extends JpaRepository<PlatformAccount, Long> {
    List<PlatformAccount> findByUserIdOrderByPlatformAsc(Long userId);
    Optional<PlatformAccount> findByUserIdAndPlatform(Long userId, PlatformType platform);
    Optional<PlatformAccount> findByIdAndUserId(Long id, Long userId);
}
