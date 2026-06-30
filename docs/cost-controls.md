# Cost Controls

## High-Cost Resources

Watch these first:

```text
NAT Gateway
EKS control plane
Aurora
ElastiCache
ALB
CloudFront
EBS volumes
Elastic IPs
CloudWatch logs
```

## Defaults

Start small:

```text
EKS node group: desired 2, max 4
Aurora: smallest acceptable serverless or instance size
Redis: single small node
HPA: min 2, max 10 only after backend is healthy
```

## Daily Habit

When not actively testing production, run the teardown checklist. NAT Gateway, EKS, Aurora, and Redis keep billing even when no users are active.