package com.postcomposer.backend.service;

import com.postcomposer.backend.dto.media.MediaFileDto;
import com.postcomposer.backend.entity.MediaFile;
import com.postcomposer.backend.entity.User;
import com.postcomposer.backend.exception.BadRequestException;
import com.postcomposer.backend.exception.ResourceNotFoundException;
import com.postcomposer.backend.repository.MediaFileRepository;
import com.postcomposer.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Storage-abstracted media upload service matching Compose.jsx allowed MIME types (image/jpeg, image/jpg, image/png).
 */
@Service
@RequiredArgsConstructor
public class MediaStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png"
    );

    private final MediaFileRepository mediaFileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Value("${app.storage.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.storage.max-file-size-bytes:10485760}")
    private long maxFileSizeBytes;

    @Transactional
    public MediaFileDto uploadMedia(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded media file cannot be empty");
        }
        if (file.getSize() > maxFileSizeBytes) {
            throw new BadRequestException("Media file exceeds maximum allowed size of 10 MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Only JPG, JPEG, and PNG image files are supported");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.png"
        );
        String ext = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : ".png";
        String storageKey = UUID.randomUUID() + ext;

        try {
            Path targetDir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(targetDir);
            Path targetFile = targetDir.resolve(storageKey);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store uploaded media file", e);
        }

        MediaFile mediaFile = MediaFile.builder()
                .user(user)
                .originalFilename(originalFilename)
                .storageKey(storageKey)
                .contentType(contentType)
                .fileSize(file.getSize())
                .publicUrl("/uploads/" + storageKey)
                .build();

        MediaFile saved = mediaFileRepository.save(mediaFile);
        auditLogService.log(userId, "MEDIA_UPLOADED", "MediaFile", String.valueOf(saved.getId()), originalFilename);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<MediaFileDto> getUserMedia(Long userId) {
        return mediaFileRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public void deleteMedia(Long userId, Long mediaId) {
        MediaFile media = mediaFileRepository.findByIdAndUserId(mediaId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Media file not found"));

        try {
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(media.getStorageKey());
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
        }

        mediaFileRepository.delete(media);
        auditLogService.log(userId, "MEDIA_DELETED", "MediaFile", String.valueOf(mediaId), media.getOriginalFilename());
    }

    private MediaFileDto toDto(MediaFile file) {
        return MediaFileDto.builder()
                .id(file.getId())
                .originalFilename(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSize(file.getFileSize())
                .url(file.getPublicUrl())
                .createdAt(file.getCreatedAt().toString())
                .build();
    }
}
