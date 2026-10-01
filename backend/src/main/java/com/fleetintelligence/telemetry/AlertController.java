package com.fleetintelligence.telemetry;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/v1/alerts")
public class AlertController {
    private final TelemetryService telemetryService;

    public AlertController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SCOPE_fleet.read') and #p0 == authentication.tokenAttributes['tenant_id']")
    public List<AlertRecord> list(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(defaultValue = "100") int limit) {
        return telemetryService.alerts(tenantId, limit);
    }

    @PostMapping("/{alertId}/acknowledge")
    @PreAuthorize("hasAuthority('SCOPE_fleet.write') and #p0 == authentication.tokenAttributes['tenant_id']")
    public AlertRecord acknowledge(
            @RequestParam(name = "tenant_id") String tenantId,
            @PathVariable String alertId) {
        return telemetryService.acknowledgeAlert(tenantId, alertId);
    }
}
