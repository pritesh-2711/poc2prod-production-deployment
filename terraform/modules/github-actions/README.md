# GitHub Actions Module

Creates a GitHub OIDC IAM role for CI/CD.

The role is scoped to:

- the configured GitHub repository
- the `main` branch by default
- ECR push/pull for Poc2Prod image repositories
- EKS cluster discovery for deployment workflows
