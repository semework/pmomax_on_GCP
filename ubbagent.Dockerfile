# Build a patched UBB agent from source instead of mirroring the vulnerable
# upstream image. The module contains replace directives, so it must be built as
# the main module rather than with `go install module@version`.
FROM golang:1.26.2-alpine AS builder

RUN apk add --no-cache git make
RUN git clone --depth 1 https://github.com/GoogleCloudPlatform/ubbagent.git /src
WORKDIR /src
ENV GOTOOLCHAIN=local
RUN go get google.golang.org/grpc@v1.79.3 \
    golang.org/x/net@latest \
    golang.org/x/oauth2@latest \
    gopkg.in/yaml.v2@latest && \
    go mod tidy
RUN make clean build

FROM alpine:3.23

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ca-certificates gettext libintl && \
    cp /usr/bin/envsubst /usr/local/bin/envsubst && \
    rm -rf /var/cache/apk/*
COPY --from=builder /src/bin/ubbagent /usr/local/bin/ubbagent
COPY --from=builder /src/docker/ubbagent-start /usr/local/bin/ubbagent-start

LABEL com.googleapis.cloudmarketplace.product.service.name=services/pmo-max.endpoints.katalyststreet-public.cloud.goog

CMD ["/usr/local/bin/ubbagent-start"]
