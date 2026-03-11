# data-test

Test assets used by Marketplace-style validation tooling.

Contents:

- `schema.yaml`: example install values for local verification.
- `tester/tester-pod.yaml.template`: functional tester pod manifest.

The deployer test wrapper uses this tester manifest (if present) and expects pod exit code `0`.
