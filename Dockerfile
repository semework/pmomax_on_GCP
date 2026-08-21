FROM golang:1.26.6-alpine@sha256:3889b425f035be855a72fb4755265311293b6d414521f0a519d819df32222d83 AS kubectl-builder

ARG KUBECTL_VERSION=v0.36.3
RUN apk add --no-cache git && \
    git init /src && \
    git -C /src remote add origin https://github.com/kubernetes/kubectl.git && \
    git -C /src fetch --depth 1 origin "${KUBECTL_VERSION}" && \
    git -C /src checkout --detach FETCH_HEAD && \
    rm -rf /src/.git && \
    wget -qO /src/kubectl.go https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.3/cmd/kubectl/kubectl.go
WORKDIR /src
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
RUN go get golang.org/x/net@v0.58.0 golang.org/x/text@v0.41.0 && \
    go mod tidy && \
    go mod verify && \
    go build -buildvcs=false -trimpath -ldflags='-s -w' -o /out/kubectl ./kubectl.go && \
    go version -m /out/kubectl | grep -F 'golang.org/x/net' | grep -F 'v0.58.0'

FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild:13.0.9@sha256:52b87686e02c387838acf0fb96181efa9ce959d77fbd51e0ffee489ef38d3492
LABEL "com.googleapis.cloudmarketplace.product.service.name"="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"

# Security hardening: refresh OS packages, kubectl binaries, and Python crypto stack.
RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    rm -rf /opt/kubectl; \
    mkdir -p /opt/kubectl/1.30 /opt/kubectl/1.31 /opt/kubectl/1.35 /opt/kubectl/1.36 /opt/kubectl/v1.36; \
    pip3 install --no-cache-dir --upgrade pip "setuptools>=78.1.1" wheel "msgpack>=1.2.1" "pyOpenSSL>=26.0.0"; \
    apt-get purge -y python3-pip python3-setuptools; \
    apt-get autoremove -y; \
    rm -rf /usr/lib/python3/dist-packages/setuptools* /usr/lib/python3/dist-packages/wheel* \
      /usr/local/lib/python3.10/dist-packages/pip* \
      /usr/local/lib/python3.10/dist-packages/setuptools*

COPY --from=kubectl-builder /out/kubectl /usr/local/bin/kubectl
RUN install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.30/kubectl && \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.31/kubectl && \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.35/kubectl && \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.36/kubectl && \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/v1.36/kubectl && \
    ln -sfn /opt/kubectl/1.36 /opt/kubectl/default

COPY deployer/deploy.sh /bin/deploy.sh
COPY deployer/deploy_with_tests.sh /bin/deploy_with_tests.sh

COPY schema.yaml /data/schema.yaml
COPY manifest/application.yaml.template /data/manifest/application.yaml.template
COPY manifest/manifests.yaml.template /data/manifest/manifests.yaml.template
COPY deploy/params.env /data/params.env.template
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
