from prometheus_client import Counter, Histogram
from starlette_prometheus import PrometheusMiddleware, metrics

# Define custom metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)

db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Database query duration in seconds",
    ["operation", "table"]
)

cache_hits_total = Counter(
    "cache_hits_total",
    "Total number of cache hits",
    ["cache_type"]
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total number of cache misses",
    ["cache_type"]
)

active_users_total = Counter(
    "active_users_total",
    "Total number of active users",
)

def setup_monitoring(app):
    """Initialize monitoring configuration."""
    # Add Prometheus middleware
    app.add_middleware(PrometheusMiddleware)
    app.add_route("/metrics", metrics)  # Endpoint for scraping metrics 