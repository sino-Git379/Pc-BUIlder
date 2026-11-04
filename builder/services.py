import math
import re
from collections import defaultdict


def _category_kind(component):
    category = component.category
    value = f"{category.name} {category.slug}".casefold()
    compact = re.sub(r'[^a-zа-яё0-9]+', '', value)
    rules = {
        'cooler': ('cooler', 'cpu cooler', 'cpucooler', 'кулер', 'охлаждение'),
        'cpu': ('cpu', 'processor', 'процессор'),
        'motherboard': ('motherboard', 'mainboard', 'материнскаяплата', 'материнка', 'materinskaya plata', 'matplata', 'materinskayaplata'),
        'gpu': ('gpu', 'graphics', 'videocard', 'видеокарта', 'графическаякарта', 'videocards'),
        'memory': ('ram', 'memory', 'оперативнаяпамять', 'память'),
        'psu': ('psu', 'powersupply', 'powersupplies', 'power-supplies', 'power', 'блокпитания', 'блокипитания', 'бп', 'blokpitaniya', 'питание', 'питания'),
        'case': ('case', 'chassis', 'корпус', 'корпуса', 'cases'),
    }
    for kind, needles in rules.items():
        if any(re.sub(r'[^a-zа-яё0-9]+', '', needle.casefold()) in compact for needle in needles):
            return kind
    if getattr(component, 'power_supply', 0) and not getattr(component, 'tdp', 0):
        return 'psu'
    return 'other'


def validate_components(components, quantities=None):
    """Return compatibility errors for an iterable of Component objects."""
    components = list(components)
    by_kind = defaultdict(list)
    for component in components:
        by_kind[_category_kind(component)].append(component)

    errors = []
    for cpu in by_kind['cpu']:
        for board in by_kind['motherboard']:
            if not cpu.socket or not board.socket:
                errors.append(f"{cpu.name} / {board.name}: укажите сокет CPU и материнской платы.")
            elif cpu.socket.strip().casefold() != board.socket.strip().casefold():
                errors.append(f"Несовместимый сокет: CPU {cpu.socket}, материнская плата {board.socket}.")

    for board in by_kind['motherboard']:
        for memory in by_kind['memory']:
            if not memory.ram_type or not board.ram_type:
                errors.append(f"{memory.name} / {board.name}: укажите тип памяти DDR4 или DDR5.")
            elif memory.ram_type.casefold() != board.ram_type.casefold():
                errors.append(f"Несовместимая память: {memory.ram_type} не подходит к плате {board.ram_type}.")

    power_components = [item for item in components if _category_kind(item) != 'psu']
    quantities = quantities or {}
    total_tdp = sum(max(0, item.tdp or 0) * quantities.get(item.pk, 1) for item in power_components)
    psus = by_kind['psu']
    if total_tdp and not psus:
        errors.append(f"Не выбран блок питания. Для компонентов требуется не менее {math.ceil(total_tdp * 1.3)} W с запасом 30%.")
    for psu in psus:
        required = math.ceil(total_tdp * 1.3)
        if total_tdp and psu.power_supply < required:
            errors.append(f"Недостаточная мощность БП: {psu.power_supply} W, требуется минимум {required} W (TDP {total_tdp} W + запас 30%).")

    for case in by_kind['case']:
        for gpu in by_kind['gpu']:
            if gpu.length_mm is None or case.max_gpu_length_mm is None:
                errors.append(f"{gpu.name} / {case.name}: укажите длину видеокарты и максимальную длину GPU для корпуса.")
            elif gpu.length_mm > case.max_gpu_length_mm:
                errors.append(f"Видеокарта {gpu.name} ({gpu.length_mm} мм) длиннее допустимого для корпуса размера ({case.max_gpu_length_mm} мм).")
        for cooler in by_kind['cooler']:
            if cooler.height_mm is None or case.max_cooler_height_mm is None:
                errors.append(f"{cooler.name} / {case.name}: укажите высоту кулера и максимальную высоту кулера для корпуса.")
            elif cooler.height_mm > case.max_cooler_height_mm:
                errors.append(f"Кулер {cooler.name} ({cooler.height_mm} мм) выше допустимого для корпуса размера ({case.max_cooler_height_mm} мм).")

    return list(dict.fromkeys(errors))


def validate_build_compatibility(build):
    items = build.items.select_related('component__category').all()
    items = list(items)
    quantities = {item.component_id: item.quantity for item in items}
    return validate_components((item.component for item in items), quantities)
