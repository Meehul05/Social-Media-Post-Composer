# ============================================================================
# Stage 1: Build Spring Boot Application JAR with Maven & JDK 17
# ============================================================================
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /workspace

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# ============================================================================
# Stage 2: Production Runtime with Eclipse Temurin JRE 17
# ============================================================================
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN groupadd -r spring && useradd -r -g spring spring
RUN mkdir -p /app/uploads && chown -R spring:spring /app

COPY --from=builder /workspace/target/post-composer-backend-1.0.0.jar /app/app.jar

USER spring:spring
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
