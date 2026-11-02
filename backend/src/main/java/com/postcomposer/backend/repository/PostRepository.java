package com.postcomposer.backend.repository;

import com.postcomposer.backend.entity.Post;
import com.postcomposer.backend.entity.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @EntityGraph(attributePaths = {"platforms"})
    Optional<Post> findByIdAndUserIdAndDeletedFalse(Long id, Long userId);

    @EntityGraph(attributePaths = {"platforms"})
    Page<Post> findByUserIdAndDeletedFalse(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"platforms"})
    Page<Post> findByUserIdAndStatusAndDeletedFalse(Long userId, PostStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"platforms"})
    List<Post> findByUserIdAndStatusAndDeletedFalseOrderByCreatedAtDesc(Long userId, PostStatus status);

    @EntityGraph(attributePaths = {"platforms"})
    List<Post> findByUserIdAndStatusAndDeletedFalseOrderByScheduledAtAsc(Long userId, PostStatus status);

    @Query("SELECT p FROM Post p WHERE p.user.id = :userId AND p.deleted = false AND LOWER(p.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Post> searchUserPosts(@Param("userId") Long userId, @Param("query") String query, Pageable pageable);

    long countByUserIdAndDeletedFalse(Long userId);

    long countByUserIdAndStatusAndDeletedFalse(Long userId, PostStatus status);
}
