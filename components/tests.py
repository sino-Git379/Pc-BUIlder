from django.test import TestCase
from django.core.management import call_command
from components.models import Component, Category
from marketplace.models import Listing
from accounts.roles import role_for_user


class SeedCatalogCommandTests(TestCase):
    def test_seed_catalog_populates_specs_and_listings(self):
        call_command('seed_catalog')

        self.assertGreaterEqual(Category.objects.count(), 6)
        self.assertGreaterEqual(Component.objects.count(), 18)

        # Check processors have socket, tdp, ram_type
        cpus = Component.objects.filter(category__slug='processors')
        self.assertTrue(cpus.exists())
        for cpu in cpus:
            self.assertTrue(cpu.socket, f"{cpu.name} missing socket")
            self.assertTrue(cpu.ram_type, f"{cpu.name} missing ram_type")
            self.assertGreater(cpu.tdp, 0, f"{cpu.name} TDP should be > 0")

        # Check motherboards have socket, ram_type, tdp, form_factor
        mobos = Component.objects.filter(category__slug='motherboards')
        self.assertTrue(mobos.exists())
        for mobo in mobos:
            self.assertTrue(mobo.socket, f"{mobo.name} missing socket")
            self.assertTrue(mobo.ram_type, f"{mobo.name} missing ram_type")
            self.assertGreater(mobo.tdp, 0, f"{mobo.name} TDP should be > 0")
            self.assertTrue(mobo.form_factor, f"{mobo.name} missing form factor")

        # Check graphics cards have tdp, length_mm
        gpus = Component.objects.filter(category__slug='graphics-cards')
        self.assertTrue(gpus.exists())
        for gpu in gpus:
            self.assertGreater(gpu.tdp, 0, f"{gpu.name} TDP should be > 0")
            self.assertIsNotNone(gpu.length_mm, f"{gpu.name} missing length_mm")

        # Check power supplies have power_supply
        psus = Component.objects.filter(category__slug='power-supplies')
        self.assertTrue(psus.exists())
        for psu in psus:
            self.assertGreater(psu.power_supply, 0, f"{psu.name} power_supply should be > 0")

        # Check cases have max_gpu_length_mm, max_cooler_height_mm
        cases = Component.objects.filter(category__slug='cases')
        self.assertTrue(cases.exists())
        for case in cases:
            self.assertIsNotNone(case.max_gpu_length_mm, f"{case.name} missing max_gpu_length_mm")
            self.assertIsNotNone(case.max_cooler_height_mm, f"{case.name} missing max_cooler_height_mm")

        # Check listings: 10-15 listings attached to Admin/Manager
        listings = Listing.objects.filter(is_active=True)
        self.assertGreaterEqual(listings.count(), 10)
        for listing in listings:
            self.assertIn(role_for_user(listing.seller), ['Admin', 'Manager'])
