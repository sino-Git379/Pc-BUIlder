from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from components.models import Category, Component
from marketplace.models import Listing

User = get_user_model()

CATEGORY_DATA = (
    ('processors', 'Процессоры'),
    ('graphics-cards', 'Видеокарты'),
    ('motherboards', 'Материнские платы'),
    ('memory', 'Оперативная память'),
    ('power-supplies', 'Блоки питания'),
    ('cases', 'Корпуса'),
    ('storage', 'Storage & NVMe'),
    ('cooling', 'Liquid & Air Cooling'),
)

COMPONENT_DATA = (
    # Processors: socket, ram_type, TDP, power_supply=0
    ('processors', 'AMD', 'Ryzen 5 7600', 65, 'AM5', 'DDR5', 0, None, None, None, None, None, '199.00', '6-ядерный процессор Zen 4, 12 потоков, до 5.1 ГГц, сокет AM5 с поддержкой DDR5.'),
    ('processors', 'AMD', 'Ryzen 7 7800X3D', 120, 'AM5', 'DDR5', 0, None, None, None, None, None, '389.00', '8-ядерный игровой процессор с технологией 3D V-Cache (96MB L3), до 5.0 ГГц, сокет AM5, DDR5.'),
    ('processors', 'Intel', 'Core i5-14600K', 125, 'LGA1700', 'DDR5', 0, None, None, None, None, None, '289.00', '14-ядерный процессор (6P+8E) Intel Raptor Lake Refresh, сокет LGA1700, DDR5.'),
    ('processors', 'Intel', 'Core i5-12400F', 65, 'LGA1700', 'DDR4', 0, None, None, None, None, None, '139.00', '6-ядерный энергоэффективный игровой процессор Intel Core 12-го поколения, LGA1700, DDR4.'),
    ('processors', 'AMD', 'Ryzen 7 7700X', 105, 'AM5', 'DDR5', 0, None, None, None, None, None, '299.00', '8 ядер / 16 потоков, частота до 5.4 ГГц, поддержка быстрой памяти DDR5, сокет AM5.'),

    # Motherboards: socket, ram_type, TDP, form_factor
    ('motherboards', 'MSI', 'MAG B650 TOMAHAWK WIFI', 50, 'AM5', 'DDR5', 0, 'ATX', None, None, None, None, '219.00', 'Материнская плата AM5 ATX с мощным VRM, поддержкой DDR5, PCIe 4.0 и Wi-Fi 6E.'),
    ('motherboards', 'ASUS', 'TUF GAMING B650-PLUS WIFI', 50, 'AM5', 'DDR5', 0, 'ATX', None, None, None, None, '209.00', 'Надежная плата ATX на чипсете B650 под сокет AM5, DDR5 и Wi-Fi 6.'),
    ('motherboards', 'MSI', 'PRO B760M-A WIFI DDR4', 45, 'LGA1700', 'DDR4', 0, 'Micro-ATX', None, None, None, None, '149.00', 'Micro-ATX плата под сокет LGA1700 с поддержкой доступной памяти DDR4 и Wi-Fi.'),
    ('motherboards', 'ASRock', 'B650M-HDV/M.2', 40, 'AM5', 'DDR5', 0, 'Micro-ATX', None, None, None, None, '119.00', 'Компактная Micro-ATX плата под сокет AM5 с поддержкой скоростной памяти DDR5.'),
    ('motherboards', 'ASUS ROG', 'Maximus Z790 Dark Hero', 60, 'LGA1700', 'DDR5', 0, 'ATX', None, None, None, None, '599.99', 'Флагманская плата LGA1700 ATX с 20+1+2 фазами питания, PCIe 5.0 x16, Wi-Fi 7 и Dual TB4 40G.'),

    # Memory: ram_type, TDP
    ('memory', 'Corsair', 'Dominator Titanium RGB 32GB', 12, None, 'DDR5', 0, None, None, None, None, None, '169.99', 'Премиальный комплект 32 ГБ (2x16 ГБ) DDR5-6000 CL30-36-36 с профилями XMP & EXPO.'),
    ('memory', 'G.Skill', 'Flare X5 32GB DDR5-6000', 10, None, 'DDR5', 0, None, None, None, None, None, '104.00', 'Комплект оперативной памяти 32 ГБ (2x16 ГБ) DDR5-6000 CL30 с профилями AMD EXPO.'),
    ('memory', 'Corsair', 'Vengeance 32GB DDR5-6000', 10, None, 'DDR5', 0, None, None, None, None, None, '109.00', 'Комплект 32 ГБ (2x16 ГБ) DDR5-6000 с поддержкой Intel XMP 3.0 и низкими задержками.'),
    ('memory', 'Corsair', 'Vengeance LPX 32GB DDR4-3200', 8, None, 'DDR4', 0, None, None, None, None, None, '64.00', 'Низкопрофильная память 32 ГБ (2x16 ГБ) DDR4-3200 CL16 для любых кулеров.'),
    ('memory', 'Kingston', 'FURY Beast 16GB DDR4-3200', 6, None, 'DDR4', 0, None, None, None, None, None, '39.00', 'Комплект 16 ГБ (2x8 ГБ) DDR4-3200 CL16 для надежных бюджетных систем.'),

    # Graphics Cards: TDP, length_mm, height_mm
    ('graphics-cards', 'ASUS ROG', 'GeForce RTX 4080 Super 16GB', 320, None, None, 0, None, 357, 149, None, None, '999.00', 'ROG Strix GeForce RTX 4080 SUPER 16GB GDDR6X OC Edition. Испарительная камера, 3x Axial-tech кулера, длина 357 мм, TDP 320W.'),
    ('graphics-cards', 'NVIDIA', 'GeForce RTX 4070 SUPER', 220, None, None, 0, None, 244, 120, None, None, '599.00', 'Архитектура Ada Lovelace, 12 ГБ GDDR6X, DLSS 3, длина видеокарты 244 мм, TDP 220W.'),
    ('graphics-cards', 'AMD', 'Radeon RX 7800 XT', 263, None, None, 0, None, 267, 130, None, None, '499.00', 'Архитектура RDNA 3, 16 ГБ GDDR6 для игр в 1440p, длина 267 мм, TDP 263W.'),
    ('graphics-cards', 'NVIDIA', 'GeForce RTX 4060', 115, None, None, 0, None, 240, 115, None, None, '299.00', 'Энергоэффективная видеокарта с 8 ГБ памяти и DLSS 3, длина 240 мм, TDP 115W.'),
    ('graphics-cards', 'AMD', 'Radeon RX 7600', 165, None, None, 0, None, 204, 115, None, None, '259.00', 'Компактная видеокарта для Full HD гейминга, длина всего 204 мм, TDP 165W.'),

    # Power Supplies: power_supply output in Watts, form_factor
    ('power-supplies', 'Seasonic', 'Focus GX-850 850W Gold ATX 3.0', 0, None, None, 850, 'ATX', None, None, None, None, '129.99', 'Премиальный БП 850 Вт, 80 Plus Gold, стандарт ATX 3.0 / PCIe 5.0 Ready, 100% модульный, 10 лет гарантии.'),
    ('power-supplies', 'Corsair', 'RM750e 750W 80+ Gold', 0, None, None, 750, 'ATX', None, None, None, None, '99.00', 'Модульный блок питания 750 Вт с сертификатом 80 Plus Gold и тихим вентилятором.'),
    ('power-supplies', 'be quiet!', 'Pure Power 12 M 650W', 0, None, None, 650, 'ATX', None, None, None, None, '99.00', 'Современный тихий БП 650 Вт стандарта ATX 3.0 с коннектором 12VHPWR PCIe 5.0.'),
    ('power-supplies', 'DeepCool', 'PQ1000M 1000W 80+ Gold', 0, None, None, 1000, 'ATX', None, None, None, None, '159.00', 'Мощный блок питания 1000 Вт 80+ Gold для прожорливых систем с мощными GPU.'),

    # Cases: max_gpu_length_mm, max_cooler_height_mm, form_factor
    ('cases', 'Lian Li', 'O11 Dynamic EVO RGB Case', 0, None, None, 0, 'ATX', None, None, 455, 167, '159.90', 'Двухкамерный корпус Mid-Tower ATX с панорамным закаленным стеклом и ARGB подсветкой. Поддержка GPU до 455 мм, радиаторов до 420 мм.'),
    ('cases', 'Corsair', '4000D Airflow', 0, None, None, 0, 'ATX', None, None, 360, 170, '104.00', 'Корпус Mid-Tower ATX с сетчатой передней панелью. Вместимость GPU: 360 мм, кулер: 170 мм.'),
    ('cases', 'NZXT', 'H5 Flow', 0, None, None, 0, 'ATX', None, None, 365, 165, '94.00', 'Стильный ATX корпус с направленным охлаждением видеокарты. GPU: 365 мм, кулер: 165 мм.'),
    ('cases', 'Fractal Design', 'Pop Mini Air', 0, None, None, 0, 'Micro-ATX', None, None, 365, 170, '89.00', 'Компактный Micro-ATX корпус с сетчатым фасадом. Вместимость GPU: 365 мм, кулер: 170 мм.'),

    # Storage & NVMe
    ('storage', 'Samsung', '990 PRO 2TB PCIe 4.0 NVMe', 8, None, None, 0, 'M.2 2280', 80, 22, None, None, '179.99', 'Флагманский NVMe SSD PCIe 4.0 x4 с радиатором: чтение 7,450 МБ/с, запись 6,900 МБ/с, ресурс 1200 TBW.'),

    # Liquid & Air Cooling
    ('cooling', 'NZXT', 'Kraken Elite 360 RGB Liquid', 25, 'AM5', None, 0, '360mm AIO', 394, 55, None, None, '279.99', 'СЖО 360 мм с круглым 2.36" IPS LCD дисплеем на помпе Asetek 7-го поколения и 3x 120мм RGB вентиляторами. Совместимость: AM5 / LGA1700.'),
)


class Command(BaseCommand):
    help = 'Create or update starter PC hardware categories, components, and marketplace listings.'

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Categories
        categories = {}
        for slug, name in CATEGORY_DATA:
            category, _ = Category.objects.update_or_create(
                slug=slug,
                defaults={'name': name},
            )
            categories[slug] = category

        # 2. Components with real specs
        components_map = {}
        created = updated = 0
        for row in COMPONENT_DATA:
            (category_slug, brand, name, tdp, socket, ram_type, power_supply,
             form_factor, length_mm, height_mm, max_gpu_length_mm, max_cooler_height_mm,
             price_avg, description) = row
            component, was_created = Component.objects.update_or_create(
                category=categories[category_slug],
                brand=brand,
                name=name,
                defaults={
                    'tdp': tdp,
                    'socket': socket,
                    'ram_type': ram_type,
                    'power_supply': power_supply,
                    'form_factor': form_factor,
                    'length_mm': length_mm,
                    'height_mm': height_mm,
                    'max_gpu_length_mm': max_gpu_length_mm,
                    'max_cooler_height_mm': max_cooler_height_mm,
                    'price_avg': Decimal(price_avg),
                    'description': description,
                },
            )
            components_map[f"{brand} {name}"] = component
            created += int(was_created)
            updated += int(not was_created)

        # 3. Manager & Admin users
        manager_group, _ = Group.objects.get_or_create(name='Manager')

        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@pcforge.local',
                password='adminpassword123'
            )

        manager_user, _ = User.objects.get_or_create(
            username='manager_alex',
            defaults={
                'email': 'alex@pcforge.local',
                'is_staff': False,
            }
        )
        if not manager_user.has_usable_password():
            manager_user.set_password('manager123!')
            manager_user.save()
        manager_user.groups.add(manager_group)

        # 4. Marketplace Listings (16 sample listings covering all Stitch cards + full catalog)
        sample_listings_data = [
            (
                'ASUS ROG GeForce RTX 4080 Super 16GB',
                admin_user,
                '999.00',
                Listing.Condition.NEW,
                '',
                'Factory sealed ASUS ROG Strix GeForce RTX 4080 Super 16GB GDDR6X OC Edition. Vapor chamber cooling, 3x Axial-tech fans, 320W TDP.'
            ),
            (
                'AMD Ryzen 7 7800X3D',
                admin_user,
                '389.00',
                Listing.Condition.NEW,
                '',
                'Новый процессор Ryzen 7 7800X3D 8-Core AM5 (96MB L3 3D V-Cache, до 5.0 ГГц) в запечатанной коробке. Официальная гарантия 36 месяцев.'
            ),
            (
                'Corsair Dominator Titanium RGB 32GB',
                manager_user,
                '169.99',
                Listing.Condition.NEW,
                '',
                'Комплект памяти Corsair Dominator Titanium RGB 32GB (2x16GB) DDR5-6000MT/s CL30-36-36. Поддержка профилей Intel XMP 3.0 и AMD EXPO.'
            ),
            (
                'Samsung 990 PRO 2TB PCIe 4.0 NVMe',
                admin_user,
                '179.99',
                Listing.Condition.NEW,
                '',
                'Твердотельный накопитель Samsung 990 PRO 2TB PCIe 4.0 NVMe с фирменным радиатором. Скорость чтения до 7450 МБ/с, запись 6900 МБ/с.'
            ),
            (
                'ASUS ROG Maximus Z790 Dark Hero',
                manager_user,
                '599.99',
                Listing.Condition.NEW,
                '',
                'Флагманская материнская плата ASUS ROG Maximus Z790 Dark Hero ATX (Intel LGA1700, 20+1+2 VRM Stages, PCIe 5.0 x16, Wi-Fi 7, Dual TB4).'
            ),
            (
                'Lian Li O11 Dynamic EVO RGB Case',
                admin_user,
                '159.90',
                Listing.Condition.NEW,
                '',
                'Панорамный двухкамерный корпус Lian Li O11 Dynamic EVO RGB (Mid-Tower ATX, закаленное стекло, GPU до 455 мм, радиаторы до 420 мм).'
            ),
            (
                'Seasonic Focus GX-850 850W Gold ATX 3.0',
                manager_user,
                '129.99',
                Listing.Condition.NEW,
                '',
                'Полностью модульный блок питания Seasonic Focus GX-850 850W 80+ Gold стандарта ATX 3.0 / PCIe 5.0 Ready. 10 лет заводской гарантии.'
            ),
            (
                'NZXT Kraken Elite 360 RGB Liquid',
                admin_user,
                '279.99',
                Listing.Condition.NEW,
                '',
                'Система жидкостного охлаждения NZXT Kraken Elite 360 RGB с 2.36" IPS LCD дисплеем, помпой Asetek 7-го поколения и 3x 120мм RGB кулерами.'
            ),
            (
                'AMD Ryzen 5 7600',
                manager_user,
                '179.00',
                Listing.Condition.USED,
                'Отличное состояние, работал 3 месяца в тестовом стенде',
                'Б/У процессор в идеальном состоянии. Ножки сокета без дефектов, любые тесты перед покупкой.'
            ),
            (
                'Intel Core i5-14600K',
                admin_user,
                '275.00',
                Listing.Condition.NEW,
                '',
                'Новый мощный процессор под LGA1700. Заводская пломба на упаковке.'
            ),
            (
                'NVIDIA GeForce RTX 4070 SUPER',
                manager_user,
                '579.00',
                Listing.Condition.NEW,
                '',
                'Новая видеокарта. Отличная тихая система охлаждения, чек и гарантия магазина.'
            ),
            (
                'AMD Radeon RX 7800 XT',
                admin_user,
                '460.00',
                Listing.Condition.USED,
                'Идеальное состояние, полный комплект с коробкой',
                'Использовалась только для домашнего гейминга, не разгонялась, температуры отличные.'
            ),
            (
                'NVIDIA GeForce RTX 4060',
                manager_user,
                '279.00',
                Listing.Condition.NEW,
                '',
                'Новая компактная видеокарта. Идеально подходит для любых корпусов и 1080p гейминга.'
            ),
            (
                'MSI MAG B650 TOMAHAWK WIFI',
                admin_user,
                '199.00',
                Listing.Condition.USED,
                'Как новая, обновлен BIOS до последней версии',
                'Плата стояла в офисном ПК 2 месяца. Полный комплект: Wi-Fi антенна, кабели SATA, коробка.'
            ),
            (
                'G.Skill Flare X5 32GB DDR5-6000',
                admin_user,
                '95.00',
                Listing.Condition.NEW,
                '',
                'Новая оперативная память 32 ГБ DDR5-6000 CL30. Оптимизирована для профилей AMD EXPO.'
            ),
            (
                'Corsair 4000D Airflow',
                admin_user,
                '95.00',
                Listing.Condition.NEW,
                '',
                'Новый белый корпус Corsair 4000D Airflow. Отличная продуваемость, закаленное стекло.'
            ),
        ]

        listings_created = listings_updated = 0
        for comp_name, seller, price, condition, used_cond, desc in sample_listings_data:
            comp = components_map.get(comp_name)
            if not comp:
                continue
            listing, was_created = Listing.objects.update_or_create(
                component=comp,
                seller=seller,
                defaults={
                    'price': Decimal(price),
                    'condition': condition,
                    'used_condition': used_cond,
                    'is_active': True,
                    'description': desc,
                }
            )
            listings_created += int(was_created)
            listings_updated += int(not was_created)

        self.stdout.write(self.style.SUCCESS(
            f'Catalog & Marketplace ready:\n'
            f'- {len(categories)} categories\n'
            f'- {created} components created, {updated} updated (total: {Component.objects.count()})\n'
            f'- {listings_created} listings created, {listings_updated} updated (total: {Listing.objects.count()})\n'
            f'- Sellers: {admin_user.username} (Admin), {manager_user.username} (Manager)'
        ))
