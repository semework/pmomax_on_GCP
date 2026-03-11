#!/bin/bash
set -euo pipefail

echo "--- 1. Resetting Path Context ---"
rm -rf .mpdev/
mkdir -p deploy/manifest

echo "--- 2. Enforcing 1.0.0 Freeze Defaults ---"
# Keep deploy/schema aligned for local tools; deployer parser reads root schema.yaml
perl -pi -e 's/publishedVersion:\s*\"[^\"]*\"/publishedVersion: \"1.0\"/g' schema.yaml
perl -pi -e 's/publishedVersion:\s*\"[^\"]*\"/publishedVersion: \"1.0\"/g' deploy/schema.yaml

echo "--- 3. Stabilizing Tester Pod (300s Retry, internal image) ---"
cat > data-test/tester/tester-pod.yaml.template <<'TPL'
apiVersion: v1
kind: Pod
metadata:
  name: "$name-tester"
  namespace: "$namespace"
  labels:
    app: "$name"
  annotations:
    marketplace.cloud.google.com/verification: test
spec:
  containers:
  - name: tester
    image: "$TESTER_IMAGE"
    command: ["/bin/sh", "-c"]
    args:
    - |
      set -e
      echo "Starting PMOMax health check..."
      for i in $(seq 1 30); do
        if node -e "const http=require('http');const req=http.get('http://$name/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(5000,()=>{req.destroy();process.exit(1)});"; then
          echo "PMOMax is healthy"
          exit 0
        fi
        echo "Attempt $i/30: waiting for http://$name/health"
        sleep 10
      done
      echo "Health check failed after 300s"
      exit 1
  restartPolicy: Never
TPL

echo "--- 4. Creating .dockerignore ---"
cat > .dockerignore <<'DOCK'
.git
.mpdev
Library/
**/*.log
.DS_Store
DOCK

echo "Sanity check and file prep complete."
