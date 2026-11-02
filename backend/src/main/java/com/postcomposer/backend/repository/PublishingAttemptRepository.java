package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.PublishingAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PublishingAttemptRepository extends JpaRepository<PublishingAttempt, Long> {
    List<PublishingAttempt> findByPostIdOrderByAttemptedAtDesc(Long postId);
}
