# PMOMax on Google Cloud Marketplace

This repository contains the public Kubernetes deployment package and command-line installation instructions for PMOMax.

## Prepared publisher release

- Release track: `1.4`
- Version: `1.4.17`
- Deployer: `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer:1.4.17`
- Deployer digest: `sha256:51af78052a732356736c4e51b68c9a879fefd6ec02a2b777e94c3143b126d0bd`
- UBB agent: `us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.17`
- UBB agent digest: `sha256:894baa6806e42a189700628e2fa1db66bebaab8342286accae8fd0a89210e4b8`

Version 1.4.17 rebuilds kubectl and the billing agent with Go 1.26.9, refreshes OpenSSL, and includes the patched application in the Marketplace image catalog. Google Artifact Analysis reported zero effective Critical/High findings for all three exact image digests on 2026-10-17; the deployer retains lower-severity findings without vendor fixes. Exact-digest `mpdev verify` passed.

The application image is `us-docker.pkg.dev/katalyststreet-public/pmomax/application:1.4.17`, digest `sha256:4db820a34749a5af3758e40b11ef06346520ad2b03df5fad2376a179cb4cf754`. The schema catalog key is `app`, so the identical image must also be available at `us-docker.pkg.dev/katalyststreet-public/pmomax/app:1.4.17` and `:1.4`. Producer Portal resolves the catalog key to this staging path; the publish helper creates and verifies these aliases.

The publisher track tag remains **1.4**; **1.4.17** is the patch version. In Producer Portal, edit the existing 1.4 release and select the display tag associated with the updated deployer digest. Registry tags alone do not refresh the public Marketplace listing: use Done → Save and Validate → Submit, then Publish after approval. Existing installations are pinned to digests and require an explicit upgrade. See [Google’s update instructions](https://docs.cloud.google.com/marketplace/docs/partners/kubernetes/maintaining-product).

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
  us-docker.pkg.dev/katalyststreet-public/pmomax/deployer@sha256:51af78052a732356736c4e51b68c9a879fefd6ec02a2b777e94c3143b126d0bd
```

The release-tag helper validates existing immutable version images and makes the deployer, application and UBB version tags available through the same release-track alias, after checking recent completed scans and rejecting effective Critical/High findings:

```bash
./publish_marketplace_deployer.sh 1.4.17
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
