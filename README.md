# PMOMax on Google Cloud Marketplace

This repository contains the public Kubernetes deployment package and command-line installation instructions for PMOMax.

## Current release

- Release track: `1.4`
- Version: `1.4.16`
- Deployer: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.16`
- Deployer digest: `sha256:175469c4513d2111942d76e7573abcc101c016488c1aaea542b33e6765971e52`
- UBB agent: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.16`
- UBB agent digest: `sha256:8b68ab7d22b6f1b8159fe2ec93fecc5bf6b93faa471ee0eb324035997111c33f`

Version 1.4.16 remediates CVE-2026-39821, CVE-2026-63073, and CVE-2026-84445. The UBB agent uses gRPC v1.83.2. Google Artifact Analysis reports zero effective Critical and High findings for both exact image digests. Exact-digest `mpdev verify` passed.

## Prerequisites

- A Google Kubernetes Engine cluster with `kubectl` configured
- Docker and the Google Cloud CLI
- The Marketplace Application CRD
- The `mpdev` script from the [Google Marketplace Kubernetes tools](https://github.com/GoogleCloudPlatform/marketplace-k8s-app-tools/blob/master/docs/mpdev-references.md)
- A reporting Secret obtained through the customer's Marketplace entitlement

Install the Application CRD:

```bash
kubectl apply -f "https://raw.githubusercontent.com/GoogleCloudPlatform/marketplace-k8s-app-tools/master/crd/app-crd.yaml"
```

## Command-line installation

Clone this repository:

```bash
git clone https://github.com/semework/pmomax_on_GCP.git
cd pmomax_on_GCP
```

Set the public Marketplace deployer image after Google publishes release track 1.4:

```bash
export PMOMAX_DEPLOYER="gcr.io/cloud-marketplace/katalyststreet-public/pmomax/deployer:1.4"
```

Install PMOMax. Replace `REPORTING_SECRET_NAME` with the reporting Secret provided for the customer's Marketplace entitlement:

```bash
mpdev install \
  --deployer="${PMOMAX_DEPLOYER}" \
  --parameters='{"APP_INSTANCE_NAME":"pmomax","NAMESPACE":"pmomax","reportingSecret":"REPORTING_SECRET_NAME"}'
```

Confirm that the application and its two-container pods are ready:

```bash
kubectl get application,pods,service -n pmomax
```

Uninstall PMOMax:

```bash
kubectl delete application pmomax -n pmomax
```

## Publisher validation

Validate the submitted immutable deployer image:

```bash
./verify_marketplace_local.sh \
  us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:175469c4513d2111942d76e7573abcc101c016488c1aaea542b33e6765971e52
```

The release-tag helper validates existing immutable version images and makes both the deployer and UBB version tags available through the same release-track alias:

```bash
./publish_marketplace_deployer.sh 1.4.16
```

## Package contents

- `schema.yaml` and `deploy/schema.yaml`: Marketplace schema v2
- `Dockerfile`: Marketplace deployer build definition
- `deployer/`: install and verification entrypoints
- `manifest/`: Application, Deployment, and Service templates
- `data-test/`: Marketplace verification configuration
- `docs/user-guide.md`: operating guidance
- `LICENSE`: repository license

Runtime data and logs remain in the customer's Google Cloud environment.
