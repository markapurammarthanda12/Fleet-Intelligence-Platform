package com.fleetintelligence.analytics;

import java.time.Instant;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/analytics/telemetry")
public class AnalyticsController {
    private final ClickHouseAnalyticsService analyticsService;

    public AnalyticsController(ClickHouseAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/hourly")
    @PreAuthorize("hasAuthority('SCOPE_fleet.read') and #p0 == authentication.tokenAttributes['tenant_id']")
    public List<HourlyTelemetryPoint> hourly(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam Instant from,
            @RequestParam Instant to) {
        return analyticsService.hourlyTelemetry(tenantId, from, to);
    }
}
