"""Create equivalent in-memory plan files for real-browser smoke tests."""
from __future__ import annotations

import csv
from io import BytesIO, StringIO
import json

import openpyxl
from playwright.sync_api import expect
import xlwt


HEADERS = [
    "record_type", "plan_id", "scenario_id", "year", "source_id",
    "order_t", "reserved_capacity_t", "investment_id", "initial_inventory_t",
    "delivery_date", "batch_id",
]


def _rows(plan):
    rows = [
        ["plan", plan["plan_id"], plan["scenario_id"], "", "", "", "", "", "", "", ""],
        ["inventory_policy", "", "", "", "", "", "", "", plan["decisions"]["inventory_policy"]["initial_inventory_t"], "", ""],
    ]
    rows.extend([
        "supply_order", "", "", row["year"], row["source_id"], row["order_t"], "", "", "",
        row.get("delivery_date", ""), row.get("batch_id", ""),
    ] for row in plan["decisions"]["supply_orders"])
    rows.extend(["capacity_reservation", "", "", row["year"], row["source_id"], "", row["reserved_capacity_t"], "", "", "", ""] for row in plan["decisions"]["capacity_reservations"])
    rows.extend(["investment", "", "", row["year"], "", "", "", row["investment_id"], "", "", ""] for row in plan["decisions"]["investments"])
    return rows


def plan_files(plan):
    csv_output = StringIO()
    csv.writer(csv_output).writerows([HEADERS, *_rows(plan)])

    xlsx = openpyxl.Workbook()
    xlsx_sheet = xlsx.active
    xlsx_sheet.title = "plan"
    for row in [HEADERS, *_rows(plan)]:
        xlsx_sheet.append(row)
    xlsx_output = BytesIO()
    xlsx.save(xlsx_output)

    xls = xlwt.Workbook()
    xls_sheet = xls.add_sheet("plan")
    for row_number, row in enumerate([HEADERS, *_rows(plan)]):
        for column, value in enumerate(row):
            xls_sheet.write(row_number, column, value)
    xls_output = BytesIO()
    xls.save(xls_output)

    return [
        ("browser-plan.json", "application/json", json.dumps(plan, ensure_ascii=False).encode()),
        ("browser-plan.csv", "text/csv", ("\ufeff" + csv_output.getvalue()).encode()),
        ("browser-plan.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx_output.getvalue()),
        ("browser-plan.xls", "application/vnd.ms-excel", xls_output.getvalue()),
    ]


def upload_all_plan_formats(page, base_url: str, plan) -> None:
    for filename, mime_type, contents in plan_files(plan):
        page.get_by_role("button", name="Планы", exact=True).click()
        page.get_by_role("dialog").get_by_role("button", name="Импорт файла", exact=True).click()
        file_input = page.get_by_label("Файл плана или проекта", exact=True)
        file_input.set_input_files({"name": filename, "mimeType": mime_type, "buffer": contents})
        expect(page.get_by_role("dialog")).to_contain_text(filename)
        with page.expect_response(
            lambda candidate: candidate.url == f"{base_url}api/plans/import"
            and candidate.request.method == "POST",
            timeout=120_000,
        ) as response_info:
            page.get_by_role("dialog").get_by_role("button", name="Импортировать", exact=True).click()
        assert response_info.value.ok, f"{filename}: {response_info.value.status}"
        expect(page.locator("#plan-name")).to_have_value(filename.rsplit(".", 1)[0], timeout=30_000)
        expect(page.locator(".calculate-button")).to_be_enabled(timeout=30_000)
