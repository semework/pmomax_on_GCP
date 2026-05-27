# Artifact Registry Cleanup - 2026-05-12

Executive summary: Old PMOMax Artifact Registry images were deleted from the active app and Marketplace repositories. The current Marketplace/runtime images and the pending `1.4.2` release images were preserved. Runtime verification after cleanup showed Cloud Run `/health` returning `{"ok":true}` and the PMOMax GKE deployment remaining `2/2` ready.

## Scope

Cleaned repositories:

- `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect`
- `us-docker.pkg.dev/katalyststreet-public/pmomax`

No GKE deployments, Cloud Run services, Secret Manager secrets, buckets, billing exports, or Marketplace service configs were changed.

## Preserved Images

### App Repository

Repository: `us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect`

| Tag | Digest | Reason preserved |
|---|---|---|
| `billingfix-auth-20260402` | `sha256:c4776926c192d9dfba013e6eaa7768a99ff1377ab642731d0560ec4d5a0e89cf` | Current PMOMax GKE runtime image |
| `1.0.2` | `sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b` | Still referenced by `schema.yaml` app image default |
| `1.4.2` | `sha256:ddcd5e759c7aa974a44b9496c7e7d4ac970f54ac8981623d968896e30c73c9d9` | Pending patched release / Cloud Run image |

Deleted:

- 319 old app image digests.

Final verification:

```text
DIGEST                                                                   TAGS
sha256:c4776926c192d9dfba013e6eaa7768a99ff1377ab642731d0560ec4d5a0e89cf  billingfix-auth-20260402
sha256:c81ce8d1c4f8bef48fa431727d464632e197734ead2f186d6ef8090978c6de8b  1.0.2
sha256:ddcd5e759c7aa974a44b9496c7e7d4ac970f54ac8981623d968896e30c73c9d9  1.4.2
```

### Marketplace Repository

Repository: `us-docker.pkg.dev/katalyststreet-public/pmomax`

| Image | Tag(s) | Digest | Reason preserved |
|---|---|---|---|
| `deployer` | `1.3`, `1.4.1` | `sha256:6c5356ad21f279feeff6119eca9f68721a1fa939efd37289d60e761c8df2f618` | Current deployed Marketplace deployer image tag set |
| `deployer` | `1.4.2` | `sha256:2433d22012fbda66239d25105e8b07f08fae13020400de0285f829406b0aa858` | Pending patched release deployer |
| `ubbagent` | `1.4.1` | `sha256:c22baf557378d61924da7546e39f40e8d3f77bb442e69a4e023410643c44a44e` | Current PMOMax GKE UBB agent |
| `ubbagent` | `1.4.2` | `sha256:0a6e68626386dc0a27e086df31dcc488bab3a2fc3d1c6ff2419aed75c77328c8` | Pending patched release UBB agent |

Deleted:

- 60 old Marketplace repository digests across old `deployer`, `pmo-architect`, `pmomax`, and `ubbagent` artifacts.

Final verification:

```text
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer  sha256:2433d22012fbda66239d25105e8b07f08fae13020400de0285f829406b0aa858  1.4.2
us-docker.pkg.dev/katalyststreet-public/pmomax/deployer  sha256:6c5356ad21f279feeff6119eca9f68721a1fa939efd37289d60e761c8df2f618  1.3,1.4.1
us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent  sha256:0a6e68626386dc0a27e086df31dcc488bab3a2fc3d1c6ff2419aed75c77328c8  1.4.2
us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent  sha256:c22baf557378d61924da7546e39f40e8d3f77bb442e69a4e023410643c44a44e  1.4.1
```

## Runtime Verification

Cloud Run health check:

```text
https://pmo-architect-839982691485.us-east1.run.app/health -> {"ok":true}
```

GKE runtime check:

```text
pmomax/pmo-architect ready replicas: 2/2
app image: us-east1-docker.pkg.dev/katalyststreet-public/apps/pmo-architect:billingfix-auth-20260402
ubbagent image: us-docker.pkg.dev/katalyststreet-public/pmomax/ubbagent:1.4.1
```

## Notes

- Some `gcloud artifacts docker images delete` operations printed `PERMISSION_DENIED` while waiting for operation status, but final inventory verification showed the targeted old images were removed.
- A few child manifest deletes initially failed because parent manifests still referenced them. After parent manifests were deleted, the remaining child manifests were deleted successfully.
