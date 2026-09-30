package com.fleetintelligence.telemetry;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/v1/vehicles")
public class VehicleController {
    private final TelemetryService telemetryService;

    public VehicleController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_fleet.read') and #p0 == authentication.tokenAttributes['tenant_id']")
    public List<VehicleOverviewRecord> list(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(defaultValue = "200") int limit) {
        return telemetryService.vehicles(tenantId, limit);
    }
}
