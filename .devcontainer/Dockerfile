# Multi-stage build for uv installation
ARG UV_VERSION=0.5.4
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Copy uv binary from official image
COPY --from=uv /uv /uvx /usr/local/bin/

# Ensure proper permissions
RUN chmod +x /usr/local/bin/uv /usr/local/bin/uvx

# uv will manage Python versions
ENV UV_PYTHON_PREFERENCE=managed
