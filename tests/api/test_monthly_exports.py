from io import BytesIO
from zipfile import ZipFile
import json


def test_batch_dates_survive_save_calculate_export_reload(client, plan):
    project = client.post('/api/projects', json={'name':'Calendar','plan':plan}).json()
    pid = project['project_id']
    response = client.post(f'/api/projects/{pid}/calculate', json={'expected_revision':1})
    assert response.status_code == 200, response.text[:600]
    result = response.json()['last_run']['result']
    batches = result['delivery_schedule']
    assert batches[0]['delivery_date'] == '2035-05-01'
    assert batches[0]['ordered_t'] == 5
    assert batches[0]['order_date'] == '2034-05-01'
    reopened = client.get(f'/api/projects/{pid}').json()
    assert reopened['last_run']['result']['delivery_schedule'] == batches
    exported = client.get(f'/api/projects/{pid}/result/export?format=csv')
    assert exported.status_code == 200
    with ZipFile(BytesIO(exported.content)) as archive:
        assert 'delivery_schedule.csv' in archive.namelist()
        assert json.loads(archive.read('result.json'))['delivery_schedule'] == batches
        assert b'2035-05-01' in archive.read('delivery_schedule.csv')
