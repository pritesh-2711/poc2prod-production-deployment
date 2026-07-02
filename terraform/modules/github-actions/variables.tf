variable "name_prefix" {
  type        = string
  description = "Prefix for GitHub Actions IAM resources."
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/name form."
}

variable "backend_ecr_arn" {
  type        = string
  description = "Backend ECR repository ARN."
}

variable "frontend_ecr_arn" {
  type        = string
  description = "Frontend ECR repository ARN."
}

variable "mcp_ecr_arn" {
  type        = string
  description = "MCP ECR repository ARN."
}

variable "eks_cluster_arn" {
  type        = string
  description = "EKS cluster ARN."
}

variable "allow_github_main_only" {
  type        = bool
  description = "Restrict GitHub role assumption to main branch."
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags for GitHub Actions IAM resources."
  default     = {}
}
