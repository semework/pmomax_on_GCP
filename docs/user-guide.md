# PMOMax Marketplace user guide

PMOMax is a Kubernetes application distributed through Google Cloud Marketplace. Version 1.4.16 deploys two PMOMax replicas with a usage-based billing agent sidecar.

## Prerequisites

- A GKE cluster with `kubectl` configured
- Docker and the Google Cloud CLI
- The Google Marketplace Kubernetes `mpdev` script
- A Marketplace reporting Secret for the customer's entitlement

Install Google's Application CRD:

```bash
kubectl apply -f "https://raw.githubusercontent.com/GoogleCloudPlatform/marketplace-k8s-app-tools/master/crd/app-crd.yaml"
```

## Install from the command line

After Google publishes release track 1.4, set the public deployer image:

```bash
export PMOMAX_DEPLOYER="gcr.io/cloud-marketplace/katalyststreet-public/pmomax/deployer:1.4"
```

Install the application, replacing the reporting Secret placeholder:

```bash
mpdev install \
  --deployer="${PMOMAX_DEPLOYER}" \
  --parameters='{"APP_INSTANCE_NAME":"pmomax","NAMESPACE":"pmomax","reportingSecret":"REPORTING_SECRET_NAME"}'
```

Optional schema properties include `DOMAIN`, `deployerServiceAccount`, `PMOMAX_APP_IMAGE`, and `PMOMAX_APP_PORT`.

## Validate the deployment

```bash
kubectl get application pmomax -n pmomax
kubectl get pods -n pmomax
kubectl get service pmomax -n pmomax
```

The two PMOMax pods should each report `2/2` ready containers. The service health endpoint is `/health`.

## Uninstall

Deleting the Application custom resource removes the resources owned by the PMOMax installation:

```bash
kubectl delete application pmomax -n pmomax
```

## Release information

- Version: `1.4.16`
- Release track: `1.4`
- Deployer digest: `sha256:175469c4513d2111942d76e7573abcc101c016488c1aaea542b33e6765971e52`
- UBB agent digest: `sha256:8b68ab7d22b6f1b8159fe2ec93fecc5bf6b93faa471ee0eb324035997111c33f`
- Solution service: `pmo-max.endpoints.katalyststreet-public.cloud.goog`

Version 1.4.16 remediates CVE-2026-39821, CVE-2026-63073, and CVE-2026-84445.
