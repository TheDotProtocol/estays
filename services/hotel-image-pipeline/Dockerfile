FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt pyproject.toml ./
COPY config ./config
COPY src ./src
COPY tests ./tests

RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -e .

RUN playwright install --with-deps chromium || true

ENV PYTHONPATH=/app/src
ENV DATASET_DIR=/app/dataset
ENV LOG_DIR=/app/logs
ENV DATABASE_URL=sqlite:////app/pipeline.db

EXPOSE 8100

CMD ["uvicorn", "hotel_pipeline.api.main:app", "--host", "0.0.0.0", "--port", "8100"]
