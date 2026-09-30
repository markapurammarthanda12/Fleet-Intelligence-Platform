package com.fleetintelligence.telemetry;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/alerts")
public class AlertController {
    private final TelemetryService telemetryService;

    public AlertController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping
    public List<AlertRecord> list(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(defaultValue = "100") int limit) {
        return telemetryService.alerts(tenantId, limit);
    }
}
