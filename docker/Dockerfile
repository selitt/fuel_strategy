ARG PYTHON_IMAGE=python:3.13-slim
FROM ${PYTHON_IMAGE} AS runtime
ARG FUEL_FRONTEND_BUILD_DIR
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1     FUEL_DATA_DIR=/data/projects FUEL_FRONTEND_DIR=/app/frontend/dist FUEL_PUBLIC_MODE=1
WORKDIR /app
COPY requirements/base.txt ./requirements.txt
RUN python -m pip install --no-cache-dir -r requirements.txt     && groupadd --gid 10001 fuel     && useradd --uid 10001 --gid 10001 --no-create-home fuel     && mkdir -p /data/projects     && chown -R 10001:10001 /data
COPY src ./src
COPY data ./data
COPY tools/project_archive.py ./tools/project_archive.py
COPY ${FUEL_FRONTEND_BUILD_DIR} ./frontend/dist
USER 10001:10001
EXPOSE 8080
# The JSON store uses an in-process lock: keep exactly one worker.
CMD ["python", "-m", "uvicorn", "src.app.web:create_web_app", "--factory", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--no-proxy-headers"]
