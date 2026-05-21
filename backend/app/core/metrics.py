from __future__ import annotations

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator, metrics


def setup_metrics(app: FastAPI) -> None:
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=False,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health", "/ready", "/favicon.ico"],
        inprogress_name="hams_requests_inprogress",
        inprogress_labels=True,
    )

    instrumentator.add(metrics.default())
    instrumentator.add(metrics.combined_size())
    instrumentator.add(metrics.requests())
    instrumentator.add(metrics.latency())

    instrumentator.instrument(app)
    instrumentator.expose(app, endpoint="/metrics", include_in_schema=False)
