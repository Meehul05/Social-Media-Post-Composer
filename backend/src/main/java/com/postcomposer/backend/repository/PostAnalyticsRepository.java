package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.PostAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PostAnalyticsRepository extends JpaRepository<PostAnalytics, Long> {
    List<PostAnalytics> findByUserIdAndRecordedDateBetweenOrderByRecordedDateAsc(
            Long userId, LocalDate startDate, LocalDate endDate);
}
