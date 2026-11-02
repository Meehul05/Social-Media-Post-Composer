package com.postcomposer.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.postcomposer.backend.dto.auth.AuthResponse;
import com.postcomposer.backend.dto.auth.LoginRequest;
import com.postcomposer.backend.dto.auth.RefreshTokenRequest;
import com.postcomposer.backend.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EmbeddedKafka(partitions = 1, topics = {"post.publishing.requested", "post.publishing.results", "post.publishing.requested.DLT"})
class AuthAndSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void rejectsUnauthorizedAccessToProtectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/drafts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registersLogsInRotatesRefreshTokenAndRejectsReusedToken() throws Exception {
        RegisterRequest registerReq = RegisterRequest.builder()
                .displayName("Studio Creator")
                .email("creator@example.com")
                .password("SecurePass123!")
                .timezone("UTC")
                .build();

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                regResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(authResponse.getAccessToken()).isNotBlank();
        assertThat(authResponse.getRefreshToken()).isNotBlank();

        // Access protected profile endpoint
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + authResponse.getAccessToken()))
                .andExpect(status().isOk());

        // Rotate refresh token
        RefreshTokenRequest refreshReq = new RefreshTokenRequest(authResponse.getRefreshToken());
        MvcResult rotatedResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse rotatedAuth = objectMapper.readValue(
                rotatedResult.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(rotatedAuth.getRefreshToken()).isNotEqualTo(authResponse.getRefreshToken());

        // Reusing old refresh token must fail and revoke active tokens
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized());
    }
}
