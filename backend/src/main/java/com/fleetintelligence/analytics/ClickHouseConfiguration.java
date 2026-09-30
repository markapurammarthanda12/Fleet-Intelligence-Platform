package com.fleetintelligence.analytics;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class ClickHouseConfiguration {
    @Bean
    RestClient clickHouseRestClient(
            RestClient.Builder builder,
            @Value("${fleet.analytics.clickhouse-url:http://localhost:8123}") String url,
            @Value("${fleet.analytics.clickhouse-user:fleetintel}") String username,
            @Value("${fleet.analytics.clickhouse-password:fleetintel_local_only}") String password) {
        return builder
                .baseUrl(url)
                .defaultHeaders(headers -> headers.setBasicAuth(username, password))
                .build();
    }
}
