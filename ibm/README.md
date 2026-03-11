# PMOMax on IBM Cloud

This folder contains IBM-specific deployment and Orchestrate integration assets. Google Cloud deployment flows remain unchanged.

## Contents
- IBM Kubernetes/OpenShift deployment: ibm/k8s, ibm/deploy-iks.sh, ibm/deploy-roks.sh
- Orchestrate integration: ibm/orchestrate/pmomax.openapi.yaml, ibm/orchestrate/prompts
- Environment template: ibm/.env.ibm

## Quick start (IKS)
1) Update ibm/.env.ibm with your IBM Cloud values (no secrets committed).
2) Run:
   - ibm/deploy-iks.sh

## Quick start (ROKS)
1) Update ibm/.env.ibm with your IBM Cloud values (no secrets committed).
2) Run:
   - ibm/deploy-roks.sh

## Required IBM Cloud CLI
- ibmcloud CLI
- Plugins: container-registry, kubernetes-service
- For ROKS: oc CLI

## Image registry
The scripts build and push to IBM Cloud Container Registry (ICR):
- icr.io/<ICR_NAMESPACE>/pmomax:<IMAGE_TAG>

Create the image pull secret in the pmomax-ibm namespace:
- icr-secret (created automatically when IBM_CLOUD_API_KEY is set)

## Kubernetes manifests
Kustomize structure:
- Base: ibm/k8s/base
- Overlays: ibm/k8s/overlays/iks and ibm/k8s/overlays/roks

Apply manually:
- kubectl apply -k ibm/k8s/overlays/iks
- oc apply -k ibm/k8s/overlays/roks

## Orchestrate integration
- OpenAPI spec: ibm/orchestrate/pmomax.openapi.yaml
- Agent instructions: ibm/orchestrate/prompts/orchestrate_agent_instructions.md

## LLM provider
Default remains Google Gemini. To use watsonx.ai:
- Set LLM_PROVIDER=ibm
- Provide IBM_WX_APIKEY, IBM_WX_PROJECT_ID, IBM_WX_REGION, IBM_WX_MODEL_ID

## Assets
Orchestrate endpoints return links to:
- /assets/gantt/<file>
- /assets/exports/<file>
These are stored under /tmp/pmomax-assets (emptyDir in Kubernetes).
