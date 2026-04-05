FROM python:3.13-slim as builder

WORKDIR /src

RUN pip install uv

COPY pyproject.toml uv.lock ./
RUN uv sync

COPY ./app ./app

FROM builder as app

EXPOSE 8000

CMD uv run fastapi dev
