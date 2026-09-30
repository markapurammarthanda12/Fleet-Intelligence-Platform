package com.fleetintelligence.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/** Keep controller scope and tenant checks active in secured deployments only. */
@Configuration
@EnableMethodSecurity
@ConditionalOnProperty(name = "fleet.security.enabled", havingValue = "true", matchIfMissing = true)
public class FleetMethodSecurityConfiguration {
}
