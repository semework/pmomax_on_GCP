# PMOMax Marketplace user guide

PMOMax is a Kubernetes application distributed through Google Cloud Marketplace. Version 1.4.17 deploys two PMOMax replicas with a usage-based billing agent sidecar.

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

- Version: `1.4.17`
- Release track: `1.4`
- Deployer digest: `sha256:51af78052a732356736c4e51b68c9a879fefd6ec02a2b777e94c3143b126d0bd`
- UBB agent digest: `sha256:894baa6806e42a189700628e2fa1db66bebaab8342286accae8fd0a89210e4b8`
- Solution service: `pmo-max.endpoints.katalyststreet-public.cloud.goog`

Version 1.4.17 retains the previous security fixes and updates kubectl and the billing agent to Go 1.26.9, refreshes OpenSSL, and deploys the patched application image.


## October 2026 security update

Version 1.4.17 rebuilds the deployer and UBB agent using Go 1.26.9, updates OpenSSL, and includes the patched application in the Marketplace image catalog. New images have no effective Critical/High findings in the recorded Artifact Analysis scans. The deployer retains lower-severity findings without vendor fixes.

The publisher must refresh release track 1.4 in Producer Portal using Save and Validate, then Submit. Existing installations do not update automatically: select the approved patched application and UBB image digests, update both containers in the customer Deployment, and verify rollout, health, entitlement and usage reporting. Preserve the customer's namespace, reporting Secret, configuration and persistent data. Follow the organization's normal rollout and rollback process.

The Display tag is the existing release track `1.4`; the patch version is `1.4.17`. The publisher deployer repository is `us-docker.pkg.dev/katalyststreet-public/pmomax/deployer`. Match its digest to the release information above.

The schema image catalog key `app` resolves to staging image `us-docker.pkg.dev/katalyststreet-public/pmomax/app`. The publisher maintains `1.4.17` and `1.4` aliases there, matching application digest `sha256:4db820a34749a5af3758e40b11ef06346520ad2b03df5fad2376a179cb4cf754`.
