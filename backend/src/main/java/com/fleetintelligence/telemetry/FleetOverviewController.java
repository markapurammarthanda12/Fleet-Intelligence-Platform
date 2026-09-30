package com.fleetintelligence.telemetry;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/fleet/overview")
public class FleetOverviewController {
    private final TelemetryService telemetryService;

    public FleetOverviewController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping
    public FleetOverviewRecord overview(@RequestParam(name = "tenant_id") String tenantId) {
        return telemetryService.overview(tenantId);
    }
}
