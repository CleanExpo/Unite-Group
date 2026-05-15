---
title: "pi-dev-ops Tech Stack"
source: "https://github.com/CleanExpo/Pi-Dev-Ops"
repo: "CleanExpo/Pi-Dev-Ops"
file_type: "tech-stack"
captured: "2026-05-15"
tags:
  - clippings
  - github
  - pi-dev-ops
---

# pi-dev-ops — Tech Stack

## pyproject.toml
```
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "tao"
version = "1.0.0"
description = "Tiered Agent Orchestrator"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.111",
    "uvicorn[standard]>=0.30",
    "websockets>=12",
    "python-multipart>=0.0.9",
    "httpx>=0.27",
    "pyyaml>=6",
    "bcrypt>=4.0",
    "anthropic>=0.90",
    "pyotp>=2.9",   # RA-1839 — TOTP validation for /api/swarm/{kill,resume}
]

[tool.pytest.ini_options]
# Root is not a Python package — add it to sys.path so `import app.server.*` works.
pythonpath = ["."]
# pytest-asyncio: auto mode runs all async test functions as asyncio coroutines.
asyncio_mode = "auto"
```
