FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild:0.12.14
LABEL "com.googleapis.cloudmarketplace.product.service.name"="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"

# Security hardening: refresh OS packages, kubectl binaries, and Python crypto stack.
RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    rm -rf /var/lib/apt/lists/*; \
    KSAFE="$(wget -qO- https://dl.k8s.io/release/stable-1.35.txt)"; \
    wget -qO /usr/local/bin/kubectl "https://dl.k8s.io/release/${KSAFE}/bin/linux/amd64/kubectl"; \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.30/kubectl; \
    install -m 0755 /usr/local/bin/kubectl /opt/kubectl/1.31/kubectl; \
    chmod +x /usr/local/bin/kubectl /opt/kubectl/1.30/kubectl /opt/kubectl/1.31/kubectl; \
    pip3 install --no-cache-dir --upgrade "pyOpenSSL>=26.0.0"

# Copy deploy scripts expected by Marketplace
COPY deployer/deploy.sh /bin/deploy.sh
COPY deployer/deploy_with_tests.sh /bin/deploy_with_tests.sh

# Keep compatibility with deploy.sh expectations:
# /data/schema.yaml
# /data/manifest/application.yaml.template
# /data/manifest/manifests.yaml.template
COPY schema.yaml /data/schema.yaml
COPY manifest/application.yaml.template /data/manifest/application.yaml.template
COPY manifest/manifests.yaml.template /data/manifest/manifests.yaml.template
COPY deploy/params.env /data/params.env.template

# Optional docs
COPY docs/ /data/docs/
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
