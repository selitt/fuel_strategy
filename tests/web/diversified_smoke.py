"""Real local six-strategy and under-table Monte Carlo acceptance."""
from __future__ import annotations

import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import httpx
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.local' / 'diversified-work' / 'browser'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    url = f'http://127.0.0.1:{port}'
    report = {'checks': [], 'errors': [], 'risk_requests': 0}
    risk_results = []

    def check(name, condition=True):
        assert condition, name
        report['checks'].append(name)
        print('PASS:', name, flush=True)

    with tempfile.TemporaryDirectory(dir=OUT) as store, (OUT / 'server.log').open('w') as log:
        env = {**os.environ, 'FUEL_DATA_DIR': store,
               'FUEL_FRONTEND_DIR': str(ROOT / 'frontend/dist'),
               'FUEL_HTTP_USER': '', 'FUEL_HTTP_PASSWORD': '', 'FUEL_PUBLIC_MODE': '0',
               'FUEL_ALLOW_UNAUTHENTICATED_LOCAL': '1', 'FUEL_BIND_HOST': '127.0.0.1'}
        proc = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'src.app.web:create_web_app',
                                 '--factory', '--host', '127.0.0.1', '--port', str(port),
                                 '--no-proxy-headers'], cwd=ROOT, env=env, stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    if httpx.get(url + '/api/health').status_code == 200:
                        break
                except httpx.HTTPError:
                    pass
                time.sleep(.1)
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
                page = browser.new_page(viewport={'width': 1920, 'height': 1000})
                page.set_default_timeout(30000)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))

                def response(res):
                    if res.url.endswith('/api/calc/risk'):
                        report['risk_requests'] += 1
                        if res.status == 200:
                            risk_results.append(res.json())

                page.on('response', response)
                page.goto(url)
                expect(page.locator('.comparison-compact-table tbody tr')).to_have_count(6)
                expect(page.locator('.comparison-compact-table .is-fresh')).to_have_count(12, timeout=60000)
                check('Six strategies calculate BASE and mandatory stress without automatic Monte Carlo', report['risk_requests'] == 0)
                colors = page.locator('.comparison-chart-legend i').evaluate_all(
                    '(items)=>items.map(e=>getComputedStyle(e).backgroundColor)')
                check('Six strategies have distinct chart colors', len(colors) == len(set(colors)) == 6)
                page.screenshot(path=str(OUT / 'six-strategies.png'))
                page.get_by_role('tab', name='Распределённый контур', exact=False).click()
                expect(page.get_by_label('Год плана поставок')).to_have_value('2035')
                expect(page.locator('.supply-matrix tr').filter(has=page.get_by_role('button', name='Параметры Earth-Flex', exact=True))).to_contain_text('1 парт.')
                page.get_by_label('Год плана поставок').select_option('2039')
                for source in ('Earth-New', 'Lunar-ISRU'):
                    expect(page.locator('.supply-matrix tr').filter(has=page.get_by_role('button', name=f'Параметры {source}', exact=True))).to_contain_text('1 парт.')
                check('Early Flex and later New/Lunar batches are visible when changing year')
                button = page.get_by_test_id('run-risk-button')
                for width, height in ((1920, 1000), (1366, 768), (1280, 720)):
                    page.set_viewport_size({'width': width, 'height': height})
                    page.locator('.strategy-summary > .panel-heading button').click()
                    expect(page.get_by_role('dialog')).to_be_visible()
                    page.get_by_role('dialog').get_by_role('button', name='Закрыть окно', exact=True).click()
                    check(f'Strategy details button receives real clicks at {width}x{height}')
                    check(f'Month labels fit their cells at {width}x{height}', page.locator('.month-cell span').evaluate_all(
                        '(items)=>items.every(e=>e.scrollWidth<=e.parentElement.clientWidth)'))
                    expect(button).to_be_visible()
                    box = button.bounding_box()
                    viewport = page.locator('.matrix-viewport').bounding_box()
                    check(f'Monte Carlo button stays below the table at {width}x{height}',
                          box['y'] >= viewport['y'] + viewport['height'] - 1)
                    button.scroll_into_view_if_needed()
                    box = button.bounding_box()
                    check(f'Monte Carlo button is reachable at {width}x{height}',
                          box['y'] >= 0 and box['y'] + box['height'] <= height)
                    check(f'No horizontal page overflow at {width}x{height}', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                    page.evaluate('window.scrollTo(0, 0)')
                    page.screenshot(path=str(OUT / f'editor-{width}.png'), full_page=True)
                with page.expect_response(lambda res: res.url.endswith('/api/calc/risk'), timeout=120000) as awaited:
                    button.click()
                    expect(page.get_by_role('dialog')).to_be_visible()
                    expect(page.get_by_role('dialog').get_by_role('button', name='Повторить проверку', exact=True)).to_be_disabled()
                result = awaited.value.json()
                expect(page.get_by_role('dialog').get_by_role('button', name='Повторить проверку', exact=True)).to_be_enabled(timeout=120000)
                expect(page.get_by_test_id('risk-trajectories')).to_be_visible(timeout=120000)
                risk = next(row for row in result['risk_register'] if row['risk_id'] == 'R_LAUNCH_FAILURE_MONTE_CARLO')
                check('Direct button calculates real 100-run BASE Monte Carlo for diversified strategy',
                      result['plan_id'] == 'strategy_diversified' and result['scenario_id'] == 'BASE'
                      and risk['iterations'] == 100 and risk['seed'] == 42
                      and len(risk['daily_trajectories']['runs']) == 100)
                report['risk_summary'] = {key: risk[key] for key in ('iterations', 'seed', 'probability_of_no_shortage', 'probability_of_all_constraints', 'median_shortage_t', 'p95_shortage_t')}
                page.screenshot(path=str(OUT / 'monte-carlo.png'))
                page.get_by_role('dialog').get_by_role('button', name='Закрыть окно', exact=True).click()
                page.get_by_role('button', name='Посмотреть результат', exact=True).click()
                expect(page.get_by_test_id('risk-trajectories')).to_be_visible()
                check('Viewing existing result does not repeat calculation', report['risk_requests'] == 1)
                page.get_by_role('dialog').get_by_role('button', name='Закрыть окно', exact=True).click()
                page.get_by_role('tab', name='Базовая', exact=False).click()
                expect(page.get_by_test_id('run-risk-button')).to_contain_text('Проверить')
                expect(page.get_by_role('button', name='Посмотреть результат', exact=True)).to_have_count(0)
                page.get_by_role('tab', name='Распределённый контур', exact=False).click()
                expect(page.get_by_role('button', name='Посмотреть результат', exact=True)).to_be_visible()
                check('Monte Carlo result belongs to its strategy and survives tab changes')
                page.get_by_role('button', name='STRESS', exact=True).first.click()
                expect(page.get_by_test_id('run-risk-button')).to_be_visible()
                check('Changing scenario marks previous Monte Carlo as stale', 'измен' in page.locator('.settings-column').inner_text().lower() or 'устар' in page.locator('.settings-column').inner_text().lower())
                page.route('**/api/calc/risk', lambda route: route.fulfill(
                    status=503, content_type='application/json',
                    body=json.dumps({'detail': 'Проверка временно недоступна'})))
                page.get_by_test_id('run-risk-button').click()
                expect(page.get_by_role('dialog').get_by_role('alert')).to_be_visible()
                expect(page.get_by_role('dialog').get_by_role('button', name='Повторить проверку', exact=True)).to_be_enabled()
                page.get_by_role('dialog').get_by_role('button', name='Закрыть окно', exact=True).click()
                expect(page.get_by_test_id('risk-launcher')).to_contain_text('недоступна')
                check('A failed request is shown honestly and allows retry without fake results')
                page.unroute('**/api/calc/risk')
                page.get_by_role('tab', name='Базовая', exact=False).click()
                expect(page.get_by_test_id('risk-launcher')).not_to_contain_text('недоступна')
                page.get_by_role('tab', name='Распределённый контур', exact=False).click()
                expect(page.get_by_test_id('risk-launcher')).to_contain_text('недоступна')
                check('Failure stays attached to its strategy across tab switches')
                page.set_viewport_size({'width': 390, 'height': 844})
                page.get_by_test_id('run-risk-button').scroll_into_view_if_needed()
                check('Mobile has no horizontal page overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                mode = page.locator('.result-toolbar .chart-mode').bounding_box()
                period = page.get_by_test_id('timeline-view-toggle').bounding_box()
                check('Mobile graph and period controls do not overlap',
                      mode['y'] + mode['height'] <= period['y']
                      or period['y'] + period['height'] <= mode['y']
                      or mode['x'] + mode['width'] <= period['x']
                      or period['x'] + period['width'] <= mode['x'])
                page.get_by_role('button', name='Подробнее · 90 дней', exact=True).click()
                expect(page.get_by_role('button', name='Подробнее · 90 дней', exact=True)).to_have_attribute('aria-pressed', 'true')
                page.get_by_role('button', name='Затраты по годам', exact=True).click()
                expect(page.get_by_test_id('cost-year-selector')).to_be_visible()
                page.get_by_role('button', name='Запас по дням', exact=True).click()
                check('Mobile graph controls receive real clicks')
                day_action = page.get_by_test_id('timeline-details-button').bounding_box()
                annual_label = page.locator('.timeline-annual-label').bounding_box()
                check('Mobile day details stay above the annual totals',
                      day_action['y'] + day_action['height'] <= annual_label['y'])
                page.evaluate('window.scrollTo(0, 0)')
                page.screenshot(path=str(OUT / 'editor-mobile.png'), full_page=True)
                page.reload()
                expect(page.locator('.comparison-compact-table tbody tr')).to_have_count(6)
                check('Reload includes the sixth builtin and writes no projects', httpx.get(url + '/api/projects').json()['total'] == 0)
                check('No JavaScript errors', not report['errors'])
                browser.close()
        finally:
            proc.terminate()
            proc.wait(timeout=10)
            (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
