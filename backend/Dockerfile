FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data/firmware_storage

ENV DATABASE_URL=sqlite:////data/backend.db
ENV FIRMWARE_STORAGE_PATH=/data/firmware_storage
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["python", "main.py"]
