package com.fleetintelligence.telemetry;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/telemetry")
public class TelemetryController {
    private final TelemetryService telemetryService;
    private final TelemetryPublisher telemetryPublisher;

    public TelemetryController(TelemetryService telemetryService, TelemetryPublisher telemetryPublisher) {
        this.telemetryService = telemetryService;
        this.telemetryPublisher = telemetryPublisher;
    }

    @PostMapping
    public ResponseEntity<IngestResponse> ingest(@Valid @RequestBody TelemetryRequest event) {
        telemetryPublisher.publish(event);
        return ResponseEntity.accepted().body(new IngestResponse(true, event.eventId(), "queued"));
    }

    @GetMapping
    public List<TelemetryRecord> history(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(name = "vehicle_id") String vehicleId,
            @RequestParam(defaultValue = "100") int limit) {
        return telemetryService.history(tenantId, vehicleId, limit);
    }

    @GetMapping("/../alerts")
    public List<AlertRecord> alerts(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(defaultValue = "100") int limit) {
        return telemetryService.alerts(tenantId, limit);
    }
}
