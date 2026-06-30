# Production Architecture

## Target Shape

CloudFront is the public entry point.

```text
users
  -> CloudFront + WAF + ACM us-east-1 cert
    /        -> S3 frontend bucket
    /api/*   -> ALB created by AWS Load Balancer Controller
    /health  -> ALB created by AWS Load Balancer Controller

ALB
  -> EKS private node group
    -> backend API pods
    -> internal MCP service
    -> Kubernetes CronJobs

backend API
  -> RDS Proxy
  -> Aurora PostgreSQL with pgvector
  -> ElastiCache Redis
  -> S3 documents bucket
  -> AWS Secrets Manager through External Secrets Operator
```

## Why This Order

The deployment is staged to keep blast radius small:

1. Foundation resources are cheap and easy to validate.
2. Backend image push is proven before CI/CD.
3. Data layer comes before compute so secrets and connection endpoints are ready.
4. EKS and controllers are installed before application workloads.
5. Backend API is deployed alone before HPA, CronJobs, MCP, and frontend.

## Production Defaults

Use one region, `ap-south-1`, with private subnets across multiple AZs. Keep CloudFront as the only public user-facing edge.

The API runs with `ENABLE_IN_PROCESS_SCHEDULER=false`; recurring work runs as Kubernetes CronJobs to avoid duplicate execution when API replicas scale.

