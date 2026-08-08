# Build a patched UBB agent from source instead of mirroring the vulnerable
# upstream image. The module contains replace directives, so it must be built as
# the main module rather than with `go install module@version`.
FROM golang:1.26.5-alpine@sha256:0178a641fbb4858c5f1b48e34bdaabe0350a330a1b1149aabd498d0699ff5fb2 AS builder

ARG UBBAGENT_COMMIT=fd35696cd9ed2858aa7f23da65c48c575347c268

RUN apk add --no-cache git make
RUN git init /src && \
    git -C /src remote add origin https://github.com/GoogleCloudPlatform/ubbagent.git && \
    git -C /src fetch --depth 1 origin "${UBBAGENT_COMMIT}" && \
    git -C /src checkout --detach FETCH_HEAD && \
    test "$(git -C /src rev-parse HEAD)" = "${UBBAGENT_COMMIT}"
WORKDIR /src
ENV GOTOOLCHAIN=local
RUN go mod verify && \
    test "$(go list -m -f '{{.Version}}' golang.org/x/crypto)" = "v0.53.0" && \
    test "$(go list -m -f '{{.Version}}' golang.org/x/net)" = "v0.56.0" && \
    make clean build

FROM alpine:3.23@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40

RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ca-certificates gettext libintl && \
    cp /usr/bin/envsubst /usr/local/bin/envsubst && \
    rm -rf /var/cache/apk/*
COPY --from=builder /src/bin/ubbagent /usr/local/bin/ubbagent
COPY --from=builder /src/docker/ubbagent-start /usr/local/bin/ubbagent-start

LABEL com.googleapis.cloudmarketplace.product.service.name=services/pmo-max.endpoints.katalyststreet-public.cloud.goog

CMD ["/usr/local/bin/ubbagent-start"]
