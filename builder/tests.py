from decimal import Decimal
from django.test import TestCase
from components.models import Category, Component
from builder.services import _category_kind, validate_components


class BuilderCompatibilityTests(TestCase):
    def setUp(self):
        self.cat_cpu = Category.objects.create(name='Процессоры', slug='processors')
        self.cat_gpu = Category.objects.create(name='Видеокарты', slug='graphics-cards')
        self.cat_mobo = Category.objects.create(name='Материнские платы', slug='motherboards')
        self.cat_ram = Category.objects.create(name='Оперативная память', slug='memory')
        self.cat_psu = Category.objects.create(name='Блоки питания', slug='power-supplies')
        self.cat_case = Category.objects.create(name='Корпуса', slug='cases')

        self.cpu = Component.objects.create(
            category=self.cat_cpu, brand='AMD', name='Ryzen 5 7600',
            socket='AM5', ram_type='DDR5', tdp=65, price_avg=Decimal('199.00')
        )
        self.mobo = Component.objects.create(
            category=self.cat_mobo, brand='MSI', name='MAG B650',
            socket='AM5', ram_type='DDR5', tdp=50, form_factor='ATX', price_avg=Decimal('219.00')
        )
        self.ram = Component.objects.create(
            category=self.cat_ram, brand='G.Skill', name='Flare X5 32GB',
            ram_type='DDR5', tdp=10, price_avg=Decimal('104.00')
        )
        self.gpu = Component.objects.create(
            category=self.cat_gpu, brand='NVIDIA', name='RTX 4070 SUPER',
            tdp=220, length_mm=244, height_mm=120, price_avg=Decimal('599.00')
        )
        self.psu = Component.objects.create(
            category=self.cat_psu, brand='Corsair', name='RM750e 750W',
            power_supply=750, tdp=0, price_avg=Decimal('99.00')
        )
        self.case = Component.objects.create(
            category=self.cat_case, brand='Corsair', name='4000D Airflow',
            max_gpu_length_mm=360, max_cooler_height_mm=170, price_avg=Decimal('104.00')
        )

    def test_category_kind_psu(self):
        self.assertEqual(_category_kind(self.psu), 'psu')

    def test_missing_psu_error(self):
        # CPU + Mobo + GPU = 65 + 50 + 220 = 335W TDP, without PSU should report missing PSU
        errors = validate_components([self.cpu, self.mobo, self.gpu])
        self.assertTrue(any('Не выбран блок питания' in err for err in errors))

    def test_sufficient_psu_passes(self):
        # 345W total TDP with 30% reserve is 449W. 750W PSU is sufficient.
        errors = validate_components([self.cpu, self.mobo, self.ram, self.gpu, self.psu, self.case])
        self.assertEqual(errors, [])

    def test_insufficient_psu_fails(self):
        weak_psu = Component.objects.create(
            category=self.cat_psu, brand='Generic', name='300W PSU',
            power_supply=300, tdp=0, price_avg=Decimal('30.00')
        )
        errors = validate_components([self.cpu, self.mobo, self.gpu, weak_psu])
        self.assertTrue(any('Недостаточная мощность БП' in err for err in errors))

    def test_ai_render_and_validate_endpoints(self):
        from rest_framework.test import APIClient
        client = APIClient()

        val_res = client.post(
            '/api/builder/validate/',
            {
                'items': [
                    {'component_id': self.cpu.id, 'quantity': 1},
                    {'component_id': self.mobo.id, 'quantity': 1},
                    {'component_id': self.ram.id, 'quantity': 1},
                    {'component_id': self.gpu.id, 'quantity': 1},
                    {'component_id': self.psu.id, 'quantity': 1},
                    {'component_id': self.case.id, 'quantity': 1},
                ]
            },
            format='json',
        )
        self.assertEqual(val_res.status_code, 200)
        self.assertTrue(val_res.data['compatible'])
        self.assertEqual(val_res.data['total_tdp'], 345)

        ai_res = client.post(
            '/api/builder/ai-render/',
            {
                'lighting': 'Kinetic Daylight Cyan',
                'angle': 'Isometric 45° Studio',
                'components': [
                    {'brand': 'NVIDIA', 'name': 'RTX 4070 SUPER', 'category_name': 'Видеокарты', 'tdp': 220},
                    {'brand': 'AMD', 'name': 'Ryzen 5 7600', 'category_name': 'Процессоры', 'tdp': 65},
                ],
            },
            format='json',
        )
        self.assertEqual(ai_res.status_code, 200)
        self.assertIn(ai_res.data['status'], ('rendered', 'limit_reached', 'provider_error'))
        self.assertIn('telemetry', ai_res.data)
        self.assertIn('ai_notes', ai_res.data)

    def test_ai_render_rate_limit_sets_limit_reached_status(self):
        from unittest.mock import patch
        import urllib.error
        from rest_framework.test import APIClient

        client = APIClient()

        # Mock urllib.request.urlopen to raise HTTP 429 Rate Limit
        http_429 = urllib.error.HTTPError(
            url='https://image.pollinations.ai/prompt/test',
            code=429,
            msg='Too Many Requests',
            hdrs={},
            fp=None,
        )

        with patch('urllib.request.urlopen', side_effect=http_429):
            res = client.post(
                '/api/builder/ai-render/',
                {
                    'lighting': 'Kinetic Daylight Cyan',
                    'angle': 'Isometric 45° Studio',
                    'components': [
                        {'brand': 'NVIDIA', 'name': 'RTX 4070 SUPER', 'category_name': 'Видеокарты', 'tdp': 220},
                    ],
                },
                format='json',
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data['status'], 'limit_reached')
            self.assertTrue(res.data.get('ai_limit_reached'))
            self.assertIn('limit reached', res.data.get('message', '').lower())

    def test_ai_render_fallback_cascade_succeeds_when_pollinations_fails(self):
        from unittest.mock import patch, MagicMock
        import urllib.error
        from rest_framework.test import APIClient

        client = APIClient()

        http_429 = urllib.error.HTTPError(
            url='https://image.pollinations.ai/prompt/test',
            code=429,
            msg='Too Many Requests',
            hdrs={},
            fp=None,
        )

        mock_gemini_resp = MagicMock()
        mock_gemini_resp.status = 200
        mock_gemini_resp.read.return_value = b'{"predictions": [{"bytesBase64Encoded": "mockGeminiBase64Data"}]}'
        mock_gemini_resp.__enter__.return_value = mock_gemini_resp
        mock_gemini_resp.__exit__.return_value = None

        def side_effect(req, *args, **kwargs):
            url = req.full_url if hasattr(req, 'full_url') else str(req)
            if 'pollinations' in url:
                raise http_429
            if 'generativelanguage' in url:
                return mock_gemini_resp
            raise Exception("Unexpected URL")

        with patch('urllib.request.urlopen', side_effect=side_effect):
            res = client.post(
                '/api/builder/ai-render/',
                {
                    'lighting': 'Kinetic Daylight Cyan',
                    'angle': 'Isometric 45° Studio',
                    'api_keys': {
                        'gemini': 'AIzaSyFakeKey123',
                    },
                    'components': [
                        {'brand': 'NVIDIA', 'name': 'RTX 4070 SUPER', 'category_name': 'Видеокарты', 'tdp': 220},
                    ],
                },
                format='json',
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.data['status'], 'rendered')
            self.assertTrue(res.data['ai_powered'])
            self.assertFalse(res.data['ai_limit_reached'])
            self.assertEqual(res.data['engine'], 'Google Gemini Imagen 3 Engine')
            self.assertEqual(res.data['image_url'], 'data:image/jpeg;base64,mockGeminiBase64Data')

            # Verify cascade trace recorded the failure and fallback
            trace = res.data.get('cascade_trace', [])
            self.assertTrue(len(trace) >= 2)
            self.assertEqual(trace[0]['provider'], 'pollinations')
            self.assertEqual(trace[0]['status'], 'failed')
            self.assertEqual(trace[1]['provider'], 'Google Gemini')
            self.assertEqual(trace[1]['status'], 'success')


