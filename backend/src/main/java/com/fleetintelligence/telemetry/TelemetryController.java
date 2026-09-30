package com.fleetintelligence.telemetry;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
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

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @PostMapping
    public ResponseEntity<IngestResponse> ingest(@Valid @RequestBody TelemetryRequest event) {
        boolean duplicate = telemetryService.ingest(event);
        HttpStatus status = duplicate ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(new IngestResponse(true, duplicate));
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
