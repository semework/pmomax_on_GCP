FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild:13.0.2
LABEL "com.googleapis.cloudmarketplace.product.service.name"="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"

# Security hardening: refresh OS packages, kubectl binaries, and Python crypto stack.
RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    KSAFE="$(wget -qO- https://dl.k8s.io/release/stable-1.35.txt)"; \
    wget -qO /usr/local/bin/kubectl "https://dl.k8s.io/release/${KSAFE}/bin/linux/amd64/kubectl"; \
    rm -rf /opt/kubectl; \
    mkdir -p /opt/kubectl/1.30 /opt/kubectl/1.31 /opt/kubectl/1.35; \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.30/kubectl; \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.31/kubectl; \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.35/kubectl; \
    ln -sfn /opt/kubectl/1.35 /opt/kubectl/default; \
    chmod +x /usr/local/bin/kubectl /opt/kubectl/1.30/kubectl /opt/kubectl/1.31/kubectl /opt/kubectl/1.35/kubectl; \
    pip3 install --no-cache-dir --upgrade pip setuptools wheel "pyOpenSSL>=26.0.0"; \
    rm -rf /usr/lib/python3/dist-packages/setuptools* /usr/lib/python3/dist-packages/wheel*

COPY deployer/deploy.sh /bin/deploy.sh
COPY deployer/deploy_with_tests.sh /bin/deploy_with_tests.sh

COPY schema.yaml /data/schema.yaml
COPY manifest/application.yaml.template /data/manifest/application.yaml.template
COPY manifest/manifests.yaml.template /data/manifest/manifests.yaml.template
COPY deploy/params.env /data/params.env.template
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
