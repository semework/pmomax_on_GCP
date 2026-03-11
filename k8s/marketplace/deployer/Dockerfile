FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst:latest

# Copy marketplace schema and manifest into expected locations.
# Keep both legacy paths and /data paths to satisfy marketplace tools.
RUN mkdir -p /data
COPY k8s/marketplace/schema.yaml /schema.yaml
COPY k8s/marketplace/schema.yaml /data/schema.yaml
COPY k8s/marketplace/manifest /manifest
COPY k8s/marketplace/manifest /data/manifest
