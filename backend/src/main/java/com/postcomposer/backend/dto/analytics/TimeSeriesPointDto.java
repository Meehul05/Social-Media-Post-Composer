package com.postcomposer.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSeriesPointDto {
    private String date;
    private int impressions;
    private int engagements;
    private int barHeightPercent;
}
