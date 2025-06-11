import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from loguru import logger

from .config import get_settings

settings = get_settings()

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Configure loguru logger
config = {
    "handlers": [
        # Console handler with color
        {
            "sink": sys.stdout,
            "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            "colorize": True,
            "level": "DEBUG" if settings.DEBUG else "INFO",
        },
        # File handler for all logs
        {
            "sink": str(LOGS_DIR / "app.log"),
            "format": "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            "rotation": "1 day",
            "retention": "1 week",
            "compression": "zip",
            "level": "INFO",
            "serialize": True,
        },
        # File handler for errors only
        {
            "sink": str(LOGS_DIR / "error.log"),
            "format": "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            "rotation": "1 day",
            "retention": "1 month",
            "compression": "zip",
            "level": "ERROR",
            "serialize": True,
        },
    ],
}

# Remove default logger and apply our configuration
logger.configure(**config)

class JSONLogMiddleware:
    """Middleware to log requests and responses in JSON format."""

    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope: Dict[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
            
        start_time = datetime.now()
        
        # Extract request information
        request = {
            "method": scope.get("method", ""),
            "path": scope.get("path", ""),
            "query_string": scope.get("query_string", b"").decode(),
            "client": scope.get("client", ("", ""))[0],
        }
        
        async def send_wrapper(message: Dict[str, Any]) -> None:
            if message["type"] == "http.response.start":
                # Calculate request duration
                duration = (datetime.now() - start_time).total_seconds()
                
                # Log request information
                log_data = {
                    "request": request,
                    "response": {
                        "status_code": message["status"],
                        "duration": duration,
                    },
                }
                
                # Log different levels based on status code
                status_code = message["status"]
                if status_code >= 500:
                    logger.error(json.dumps(log_data))
                elif status_code >= 400:
                    logger.warning(json.dumps(log_data))
                else:
                    logger.info(json.dumps(log_data))
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)

def setup_logging() -> None:
    """Initialize logging configuration."""
    logger.info("Logging system initialized") 