package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, Long> {
    List<MediaFile> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<MediaFile> findByIdAndUserId(Long id, Long userId);
    List<MediaFile> findByIdInAndUserId(List<Long> ids, Long userId);
}
