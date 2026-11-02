package com.postcomposer.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.postcomposer.backend.dto.auth.AuthResponse;
import com.postcomposer.backend.dto.auth.RegisterRequest;
import com.postcomposer.backend.dto.post.MoveScheduleRequestDto;
import com.postcomposer.backend.dto.post.PostRequestDto;
import com.postcomposer.backend.dto.post.PostResponseDto;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@EmbeddedKafka(partitions = 1, topics = {"post.publishing.requested", "post.publishing.results", "post.publishing.requested.DLT"})
class PostDraftScheduleIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void fullWorkflowForDraftsSchedulingCalendarMoveAndCrossUserIsolation() throws Exception {
        String userAToken = registerAndGetToken("usera@example.com");
        String userBToken = registerAndGetToken("userb@example.com");

        // 1. User A creates a draft
        PostRequestDto draftReq = PostRequestDto.builder()
                .post("Draft post for Instagram & LinkedIn")
                .instagram(true)
                .linkedin(true)
                .build();

        MvcResult draftRes = mockMvc.perform(post("/api/v1/drafts")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(draftReq)))
                .andExpect(status().isCreated())
                .andReturn();

        PostResponseDto createdDraft = objectMapper.readValue(
                draftRes.getResponse().getContentAsString(), PostResponseDto.class);
        assertThat(createdDraft.getStatus()).isEqualTo("DRAFT");

        // 2. Cross-user isolation: User B cannot delete User A's draft
        mockMvc.perform(delete("/api/v1/drafts/" + createdDraft.getId())
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isNotFound());

        // 3. User A schedules a post for 2028-05-10
        PostRequestDto schedReq = PostRequestDto.builder()
                .post("Launch announcement scheduled post")
                .instagram(true)
                .linkedin(false)
                .date("2028-05-10")
                .time("14:30")
                .build();

        MvcResult schedRes = mockMvc.perform(post("/api/v1/scheduled-posts")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(schedReq)))
                .andExpect(status().isCreated())
                .andReturn();

        PostResponseDto scheduledPost = objectMapper.readValue(
                schedRes.getResponse().getContentAsString(), PostResponseDto.class);
        assertThat(scheduledPost.getScheduledAt()).isEqualTo("2028-05-10T14:30");

        // 4. Drag-and-drop move on Calendar to 2028-05-18
        MoveScheduleRequestDto moveReq = MoveScheduleRequestDto.builder()
                .newDate("2028-05-18")
                .build();

        MvcResult movedRes = mockMvc.perform(put("/api/v1/scheduled-posts/" + scheduledPost.getId() + "/move")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(moveReq)))
                .andExpect(status().isOk())
                .andReturn();

        PostResponseDto movedPost = objectMapper.readValue(
                movedRes.getResponse().getContentAsString(), PostResponseDto.class);
        assertThat(movedPost.getDate()).isEqualTo("2028-05-18");
        assertThat(movedPost.getScheduledAt()).isEqualTo("2028-05-18T14:30");
    }

    private String registerAndGetToken(String email) throws Exception {
        RegisterRequest req = RegisterRequest.builder()
                .displayName("User " + email)
                .email(email)
                .password("Password123!")
                .build();
        MvcResult res = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(res.getResponse().getContentAsString(), AuthResponse.class).getAccessToken();
    }
}
