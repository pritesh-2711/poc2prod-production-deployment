#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${CLUSTER_NAME:-poc2prod-prod}"

helm repo add eks https://aws.github.io/eks-charts
helm repo add external-secrets https://charts.external-secrets.io
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="${CLUSTER_NAME}" \
  --set region="${AWS_REGION}"

helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace

helm upgrade --install metrics-server metrics-server/metrics-server \
  -n kube-system

helm upgrade --install fluent-bit fluent/fluent-bit \
  -n logging \
  --create-namespace

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace

