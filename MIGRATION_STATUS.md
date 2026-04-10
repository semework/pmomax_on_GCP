# PMOMax-On-GCP Status

## Completed

- Renamed legacy document and folder names to PMOMax naming.
- Removed inherited non-PMOMax multi-service template manifests and directories.
- Kept only PMOMax PID Architect deployment assets and Marketplace templates.
- Updated test values to PMOMax-only image parameters.

## Current PMOMax-Scoped Manifest Set

- `manifest/manifests.yaml.template`
- `manifest/application.yaml.template`
- `manifest/app.yaml`
- `manifest/pmomax-pid-architect-deployment.yaml`
- `manifest/pmomax-pid-architect-service.yaml`
- `manifest/pmomax-pid-architect-ingress.yaml`
- `deploy/manifest/app.yaml`
- `deploy/manifest/pmomax-pid-architect-deployment.yaml`
- `deploy/manifest/pmomax-pid-architect-service.yaml`
- `deploy/manifest/pmomax-pid-architect-ingress.yaml`

## Remaining Manual Review Items

- Final production domain names and TLS/certificate policy.
- Final Artifact Registry image tags and promotion workflow.
- Marketplace listing metadata (links, legal, support).
