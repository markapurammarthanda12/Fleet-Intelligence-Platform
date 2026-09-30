import unittest

from fleetpulse.simulator import generate_events, generate_vehicles


class SimulatorTests(unittest.TestCase):
    def test_generates_exactly_one_hundred_thousand_stable_vehicle_ids(self):
        first = list(generate_vehicles(100_000, seed=17))
        second = list(generate_vehicles(100_000, seed=17))

        self.assertEqual(len(first), 100_000)
        self.assertEqual(len({vehicle["vehicle_id"] for vehicle in first}), 100_000)
        self.assertEqual(first, second)
        self.assertEqual(len({vehicle["tenant_id"] for vehicle in first}), 20)
        self.assertTrue(all(vehicle["synthetic"] for vehicle in first))

    def test_event_stream_covers_fleet_when_event_count_matches_vehicle_count(self):
        events = list(generate_events(vehicles=1_000, events=1_000, seed=23))
        unique_vehicle_ids = {event["vehicle_id"] for event in events}

        self.assertEqual(unique_vehicle_ids, {f"vehicle-{number:06d}" for number in range(1_000)})
        self.assertEqual(len({event["event_id"] for event in events}), 1_000)
        self.assertEqual(events, list(generate_events(vehicles=1_000, events=1_000, seed=23)))

    def test_vehicle_records_never_claim_to_contain_real_vehicle_data(self):
        vehicle = next(generate_vehicles(1, seed=42))

        self.assertTrue(vehicle["synthetic"])
        self.assertTrue(vehicle["synthetic_asset_id"].startswith("SYNTH-"))


if __name__ == "__main__":
    unittest.main()
