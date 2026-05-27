# PMO Max 6-Hour UBB Reporting Test Evidence

Prepared: 2026-04-22T03:17:44Z

## Summary

The PMO Max `pmo-architect` deployment successfully satisfied the 6-hour continuous UBB reporting requirement.

The first documented successful `ubbagent` report was recorded at:

```text
2026-04-21T17:33:29.521103341Z
```

The required 6-hour completion point was therefore:

```text
2026-04-21T23:33:29.521103341Z
```

Cloud Logging showed successful reports continuing through at least:

```text
2026-04-22T03:14:51.353048688Z
```

Total documented successful reporting window:

```text
9 hours, 41 minutes, 21.831945347 seconds
```

This exceeds the required 6-hour window by approximately:

```text
3 hours, 41 minutes, 21.831945347 seconds
```

## Kubernetes Evidence

Namespace:

```text
pmomax
```

Deployment label:

```text
app=pmo-architect
```

Pod status at verification:

```text
NAME                             READY   STATUS    RESTARTS       AGE
pmo-architect-6cf8c4494c-7kdcj   2/2     Running   1 (5h7m ago)   5h9m
pmo-architect-6cf8c4494c-m8kx6   2/2     Running   0              4h8m
```

Important note: the single restart shown for `pmo-architect-6cf8c4494c-7kdcj` was on the `app` container, not the `ubbagent` container. Direct pod JSON inspection showed both active `ubbagent` containers had:

```text
restartCount: 0
```

## Cloud Logging Evidence

The GKE cluster context was:

```text
gke_katalyststreet-public_us-central1_pmomax-auto
```

The Cloud Logging query needed to be run against project:

```text
katalyststreet-public
```

The successful UBB report messages were stored in `jsonPayload.message`, not `textPayload`.

Successful report query used:

```bash
gcloud logging read \
  'resource.type="k8s_container" AND
   resource.labels.namespace_name="pmomax" AND
   resource.labels.container_name="ubbagent" AND
   jsonPayload.message="ServiceControlEndpoint:Send(): success" AND
   timestamp>="2026-04-21T17:30:00Z"' \
  --project katalyststreet-public \
  --limit 2000 \
  --format 'value(timestamp)' \
  --order asc
```

Backfill summary:

```text
count=1152
first=2026-04-21T17:33:29.521103341Z
last=2026-04-22T03:14:40.918687995Z
```

Final fresh success check:

```text
2026-04-22T03:14:51.353048688Z    pmo-architect-6cf8c4494c-m8kx6
2026-04-22T03:14:40.918687995Z    pmo-architect-6cf8c4494c-7kdcj
```

## Conclusion

The PMO Max deployment produced successful UBB reports continuously for more than 6 hours. The documented window from `2026-04-21T17:33:29.521103341Z` through `2026-04-22T03:14:51.353048688Z` confirms approximately 9 hours and 41 minutes of successful reporting, exceeding the 6-hour requirement.
