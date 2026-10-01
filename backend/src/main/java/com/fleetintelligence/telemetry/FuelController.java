package com.fleetintelligence.telemetry;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/fuel")
public class FuelController {
    private final FuelService fuelService;

    public FuelController(FuelService fuelService) {
        this.fuelService = fuelService;
    }

    @GetMapping("/purchases")
    @PreAuthorize("hasAuthority('SCOPE_fleet.read') and #p0 == authentication.tokenAttributes['tenant_id']")
    public List<FuelPurchaseRecord> purchases(
            @RequestParam(name = "tenant_id") String tenantId,
            @RequestParam(defaultValue = "100") int limit) {
        return fuelService.purchases(tenantId, limit);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('SCOPE_fleet.read') and #p0 == authentication.tokenAttributes['tenant_id']")
    public FuelSummaryRecord summary(@RequestParam(name = "tenant_id") String tenantId) {
        return fuelService.summary(tenantId);
    }

    @PostMapping("/simulate-refuelling")
    @PreAuthorize("hasAuthority('SCOPE_fleet.ingest') and #p0 == authentication.tokenAttributes['tenant_id']")
    public FuelSimulationResultRecord triggerRefuelling(@RequestParam(name = "tenant_id") String tenantId) {
        return fuelService.triggerRefuelling(tenantId);
    }
}
