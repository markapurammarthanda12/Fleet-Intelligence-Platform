CREATE TABLE fuel_purchases (
    purchase_id UUID PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    vehicle_id VARCHAR(64) NOT NULL,
    fuel_type VARCHAR(16) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel')),
    purchased_at TIMESTAMPTZ NOT NULL,
    litres NUMERIC(10, 3) NOT NULL CHECK (litres > 0 AND litres <= 2000),
    price_per_litre NUMERIC(10, 2) NOT NULL CHECK (price_per_litre > 0 AND price_per_litre <= 1000),
    total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (round(litres * price_per_litre, 2)) STORED,
    co2_estimate_kg NUMERIC(12, 3) GENERATED ALWAYS AS (
        round(litres * CASE fuel_type WHEN 'petrol' THEN 2.35 ELSE 2.69 END, 3)
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX fuel_purchases_tenant_date_idx
    ON fuel_purchases (tenant_id, purchased_at DESC);

CREATE INDEX fuel_purchases_tenant_vehicle_date_idx
    ON fuel_purchases (tenant_id, vehicle_id, purchased_at DESC);

-- Synthetic starting history makes the demo totals useful before the first trigger.
INSERT INTO fuel_purchases (purchase_id, tenant_id, vehicle_id, fuel_type, purchased_at, litres, price_per_litre)
SELECT md5('fleet-demo-fuel-' || n)::uuid,
       'tenant-100k',
       'vehicle-' || lpad((n * 97)::text, 6, '0'),
       CASE WHEN n % 4 = 0 THEN 'diesel' ELSE 'petrol' END,
       CASE WHEN n <= 8
            THEN now() - (((n - 1) * 2)::text || ' hours')::interval
            ELSE date_trunc('month', now()) - interval '1 month'
                 + (((n - 9) * 20)::text || ' hours')::interval END,
       (42 + (n * 13 % 31))::numeric(10, 3),
       CASE WHEN n % 4 = 0 THEN 91.50 ELSE 104.75 END
FROM generate_series(1, 36) AS n;
