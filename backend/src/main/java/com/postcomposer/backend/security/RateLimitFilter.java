package com.postcomposer.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sliding-window rate limiter for authentication and AI generation endpoints.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 30;
    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/ai/")) {
            String clientKey = request.getRemoteAddr() + ":" + path;
            long currentMinute = Instant.now().getEpochSecond() / 60;
            WindowCounter counter = counters.compute(clientKey, (k, existing) -> {
                if (existing == null || existing.minute != currentMinute) {
                    return new WindowCounter(currentMinute, new AtomicInteger(1));
                }
                existing.count.incrementAndGet();
                return existing;
            });

            if (counter.count.get() > MAX_AUTH_REQUESTS_PER_MINUTE) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"errorCode\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"Too many requests. Please try again shortly.\"}");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private record WindowCounter(long minute, AtomicInteger count) {}
}
