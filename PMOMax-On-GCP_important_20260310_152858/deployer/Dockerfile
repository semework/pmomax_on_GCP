FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild
LABEL "com.googleapis.cloudmarketplace.product.service.name"="services/pmo-max.endpoints.katalyststreet-public.cloud.goog"

USER root
# Reduce known CVEs from the upstream base by refreshing OS packages and kubectl binaries.
RUN apt-get update && \
    apt-get -y upgrade && \
    rm -rf /var/lib/apt/lists/* && \
    full="$(wget -qO- https://dl.k8s.io/release/stable-1.34.txt)" && \
    wget -q -O /tmp/kubectl "https://dl.k8s.io/release/${full}/bin/linux/amd64/kubectl" && \
    chmod +x /tmp/kubectl && \
    for slot in 1.30 1.31 1.34 default; do \
      mkdir -p "/opt/kubectl/${slot}" && \
      cp /tmp/kubectl "/opt/kubectl/${slot}/kubectl"; \
    done && \
    rm -f /tmp/kubectl

COPY deployer/deploy.sh /bin/deploy.sh
COPY deployer/deploy_with_tests.sh /bin/deploy_with_tests.sh

COPY deploy/schema.yaml /data/schema.yaml
COPY deploy/test-values.yaml /data/test-values.yaml
COPY manifest/ /data/manifest/
COPY deploy/params.env /data/params.env.template
COPY docs/ /data/docs/
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
