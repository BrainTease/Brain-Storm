# Multi-stage contract build container
FROM rust:1.82-slim AS builder

WORKDIR /contracts

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add wasm32-unknown-unknown && \
    cargo install --locked stellar-cli --features opt

COPY Cargo.toml Cargo.lock ./
COPY contracts/ ./contracts/
COPY scripts/build.sh ./scripts/

RUN chmod +x scripts/build.sh && ./scripts/build.sh

FROM scratch AS artifacts
COPY --from=builder /contracts/contracts/*/target/wasm32-unknown-unknown/release/*.wasm /wasm/
