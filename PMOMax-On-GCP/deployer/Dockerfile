FROM gcr.io/google-appengine/debian11

LABEL "com.googleapis.cloudmarketplace.product.service.name"="services/pmomax.endpoints.katalyststreet-public.cloud.goog"

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gettext-base \
    kubectl \
    && rm -rf /var/lib/apt/lists/*

# Copy deploy scripts expected by Marketplace
COPY deployer/deploy.sh /bin/
COPY deployer/deploy_with_tests.sh /bin/

# Schema + values
COPY deploy/schema.yaml /data/schema.yaml

# Manifests
COPY manifest/ /data/manifest/

# Optional docs
# COPY docs/ /data/docs/
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
