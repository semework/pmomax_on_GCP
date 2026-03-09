FROM gcr.io/cloud-marketplace-tools/k8s/deployer_envsubst/onbuild

COPY --chmod=755 deployer/deploy.sh /bin/deploy.sh
COPY --chmod=755 deployer/deploy_with_tests.sh /bin/deploy_with_tests.sh

COPY schema.yaml /data/schema.yaml
COPY manifest/application.yaml.template /data/manifest/application.yaml.template
COPY manifest/manifests.yaml.template /data/manifest/manifests.yaml.template
COPY deploy/params.env /data/params.env.template
COPY data-test/ /data-test/

USER 1001
ENTRYPOINT ["/bin/deploy_with_tests.sh"]
