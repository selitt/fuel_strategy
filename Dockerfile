FROM python:3.13.5-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    FUEL_DATA_DIR=/data/projects
WORKDIR /app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt \
    && groupadd --gid 10001 fuel \
    && useradd --uid 10001 --gid 10001 --no-create-home fuel \
    && mkdir -p /data/projects \
    && chown -R 10001:10001 /data
COPY src ./src
COPY fuel-hackathon/test_oil ./fuel-hackathon/test_oil
USER 10001:10001
EXPOSE 8000
# One worker is intentional: local JSON persistence uses an in-process lock.
CMD ["python", "-m", "uvicorn", "src.app.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
