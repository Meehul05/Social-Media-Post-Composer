package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.JobStatus;
import com.postcomposer.backend.entity.ScheduledJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScheduledJobRepository extends JpaRepository<ScheduledJob, Long> {

    Optional<ScheduledJob> findByPostId(Long postId);

    @Query("SELECT j FROM ScheduledJob j JOIN FETCH j.post WHERE j.jobStatus = :status AND j.scheduledAt <= :now ORDER BY j.scheduledAt ASC")
    List<ScheduledJob> findDueJobs(@Param("status") JobStatus status, @Param("now") Instant now);
}
