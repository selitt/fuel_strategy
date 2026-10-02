"""Apply research assumptions to a private catalog, never to CASE_INPUT."""
from copy import deepcopy
from datetime import date
import math

from .calendar import PlanValidationError, PlanValidationIssue, shift_source_date
from .loader import CaseCatalog


def _invalid(source_id, field, message):
    return PlanValidationError(message, issue=PlanValidationIssue(
        code='invalid_source_override', message=message,
        loc=('source_overrides', source_id, field), source_id=source_id,
    ))


def _profile(value, source_id):
    try:
        pairs = [item.split(':') for item in value.split(';')]
        parts = {key.strip(): float(probability) for key, probability in pairs}
        if len(parts) != len(pairs) or not parts or any(
            not math.isfinite(p) or not 0 <= p <= 1 for p in parts.values()
        ):
            raise ValueError
        return parts
    except (ValueError, TypeError, AttributeError):
        raise _invalid(source_id, 'reliability_profile', 'Укажите вероятности от 0 до 1 для каждого элемента профиля.') from None


def catalog_with_source_overrides(catalog: CaseCatalog, overrides: dict) -> CaseCatalog:
    result = deepcopy(catalog)
    for source_id, changes in overrides.items():
        original = catalog.sources.get(source_id)
        if original is None or original.source_id != source_id:
            raise _invalid(source_id, 'source_id', 'Используйте код существующего поставщика из справочника.')
        source = result.sources[source_id]
        for field, value in changes.items():
            attribute = 'reservation_rate' if field == 'reservation_rate_mln_per_t_year_capacity' else field
            setattr(source, attribute, value)
        if source.lead_time_min_value > source.lead_time_max_value:
            raise _invalid(source_id, 'lead_time_min_value', 'Минимальный срок не должен превышать максимальный.')
        if source.available_from_year is None and original.available_from_year is not None:
            raise _invalid(source_id, 'available_from_year', 'Укажите известный год доступности поставщика.')
        # Reject values which cannot be represented by the existing model calendar.
        try:
            for boundary in (date(min(catalog.years), 1, 1), date(max(catalog.years), 12, 31)):
                for direction in (-1, 1):
                    shift_source_date(source, boundary, direction)
        except (ValueError, OverflowError):
            raise _invalid(source_id, 'lead_time_max_value', 'Срок выходит за поддерживаемый календарь (годы 1–9999).') from None
        base_profile = _profile(original.reliability_profile, source_id)
        profile = _profile(source.reliability_profile, source_id)
        if all(key.isdigit() for key in base_profile):
            required = set(base_profile) | {
                str(year) for year in catalog.years
                if source.available_from_year is not None and year >= source.available_from_year
            }
            if not required <= profile.keys() or any(key not in required for key in profile):
                raise _invalid(source_id, 'reliability_profile', 'Укажите надёжность для всех доступных лет, сохранив годы исходного профиля.')
        elif profile.keys() != base_profile.keys():
            raise _invalid(source_id, 'reliability_profile', 'Сохраните структуру исходного профиля надёжности.')
        source.reliability_profile = ';'.join(f'{key}:{value}' for key, value in profile.items())
    return result
