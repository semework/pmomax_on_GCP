# Build a patched UBB agent from source instead of mirroring the vulnerable
# upstream image. The module contains replace directives, so it must be built as
# the main module rather than with `go install module@version`.
FROM golang:1.26.6-alpine@sha256:3889b425f035be855a72fb4755265311293b6d414521f0a519d819df32222d83 AS builder

ARG UBBAGENT_COMMIT=fd35696cd9ed2858aa7f23da65c48c575347c268

RUN apk add --no-cache git make
RUN git init /src && \
    git -C /src remote add origin https://github.com/GoogleCloudPlatform/ubbagent.git && \
    git -C /src fetch --depth 1 origin "${UBBAGENT_COMMIT}" && \
    git -C /src checkout --detach FETCH_HEAD && \
    test "$(git -C /src rev-parse HEAD)" = "${UBBAGENT_COMMIT}"
WORKDIR /src
ENV GOTOOLCHAIN=local
RUN go get golang.org/x/crypto@v0.55.0 \
        golang.org/x/net@v0.58.0 \
        golang.org/x/text@v0.41.0 \
        google.golang.org/grpc@v1.83.1 && \
    go mod tidy && \
    go mod verify && \
    test "$(go list -m -f '{{.Version}}' golang.org/x/crypto)" = "v0.55.0" && \
    test "$(go list -m -f '{{.Version}}' golang.org/x/net)" = "v0.58.0" && \
    test "$(go list -m -f '{{.Version}}' golang.org/x/text)" = "v0.41.0" && \
    test "$(go list -m -f '{{.Version}}' google.golang.org/grpc)" = "v1.83.1" && \
    make clean build
COPY ubbagent-entrypoint.go /entrypoint/ubbagent-entrypoint.go
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /out/ubbagent-entrypoint /entrypoint/ubbagent-entrypoint.go && \
    mkdir -p /runtime-tmp && chmod 1777 /runtime-tmp

FROM gcr.io/distroless/static-debian12:nonroot@sha256:1b7b9f0f0e0a1d2155f531db587cc48ec26aaf97ab64364225f5bf18a054e66a

COPY --from=builder /src/bin/ubbagent /usr/local/bin/ubbagent
COPY --from=builder /out/ubbagent-entrypoint /usr/local/bin/ubbagent-entrypoint
COPY --from=builder /runtime-tmp /tmp

LABEL com.googleapis.cloudmarketplace.product.service.name=services/pmo-max.endpoints.katalyststreet-public.cloud.goog

USER 65532:65532
ENTRYPOINT ["/usr/local/bin/ubbagent-entrypoint"]
