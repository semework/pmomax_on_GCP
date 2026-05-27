# PMOMax Secret Restore Instructions

Generated: 2026-05-22

These commands restore the three PMOMax Kubernetes secrets from Secret Manager backups without printing secret values.

Do not run restore commands unless intentionally recreating the validation cluster or recovering PMOMax Kubernetes secret state.

## Prerequisites

- `gcloud` authenticated to an account with Secret Manager access.
- `kubectl` context set to the target GKE cluster.
- Target namespaces exist:
  - `pmomax`
  - `default`
- `jq` installed.

Verify context without printing secrets:

```sh
gcloud config get-value project
kubectl config current-context
kubectl get namespace pmomax
kubectl get namespace default
```

## Restore `pmomax/pmo-architect-reporting-secret`

This command reads the Secret Manager backup, reconstructs a Kubernetes Secret manifest in memory, and pipes it directly to `kubectl apply`.

```sh
gcloud secrets versions access latest \
  --secret=pmomax-pmo-architect-reporting-secret-backup \
  --project=katalyststreet-public \
| jq -c '{apiVersion:"v1", kind:"Secret", metadata:{name:.source.name, namespace:.source.namespace}, type:.source.type, data:.data}' \
| kubectl apply -f -
```

Verify metadata only:

```sh
kubectl get secret pmo-architect-reporting-secret -n pmomax \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp
```

## Restore `pmomax/pmomax-license-998217`

```sh
gcloud secrets versions access latest \
  --secret=pmomax-license-998217-pmomax-namespace-backup \
  --project=katalyststreet-public \
| jq -c '{apiVersion:"v1", kind:"Secret", metadata:{name:.source.name, namespace:.source.namespace}, type:.source.type, data:.data}' \
| kubectl apply -f -
```

Verify metadata only:

```sh
kubectl get secret pmomax-license-998217 -n pmomax \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp
```

## Restore `default/pmomax-license-998217`

```sh
gcloud secrets versions access latest \
  --secret=pmomax-license-998217-default-namespace-backup \
  --project=katalyststreet-public \
| jq -c '{apiVersion:"v1", kind:"Secret", metadata:{name:.source.name, namespace:.source.namespace}, type:.source.type, data:.data}' \
| kubectl apply -f -
```

Verify metadata only:

```sh
kubectl get secret pmomax-license-998217 -n default \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp
```

## Post-Restore PMOMax Checks

After restoring into a validation cluster:

```sh
kubectl get deploy pmo-architect -n pmomax
kubectl get pods -n pmomax
kubectl get configmap pmo-architect-ubbagent-config -n pmomax
kubectl get secret pmo-architect-reporting-secret -n pmomax \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type
```

Do not use `kubectl get secret -o yaml` or `kubectl describe secret` in shared logs unless the output is known not to expose sensitive material.

## Backup Secret Manager Names

- `pmomax-pmo-architect-reporting-secret-backup`
- `pmomax-license-998217-pmomax-namespace-backup`
- `pmomax-license-998217-default-namespace-backup`

## Security Notes

- Do not redirect restored payloads to local files.
- Do not echo payloads.
- Do not paste payloads into tickets or Markdown.
- Treat anyone with Secret Manager Secret Accessor on these backup secrets as able to recover the original Kubernetes secrets.

