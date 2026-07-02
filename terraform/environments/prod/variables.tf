variable "project" {
  type        = string
  description = "Project name used in resource names."
  default     = "poc2prod"
}

variable "environment" {
  type        = string
  description = "Deployment environment."
  default     = "prod"
}

variable "aws_region" {
  type        = string
  description = "AWS region for regional resources."
  default     = "ap-south-1"
}

variable "domain_name" {
  type        = string
  description = "Production domain name."
  default     = "poc2prod.pritesh-jha.in"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the production VPC."
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Public subnet CIDRs."
  default     = ["10.40.0.0/20", "10.40.16.0/20"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Private subnet CIDRs."
  default     = ["10.40.128.0/20", "10.40.144.0/20"]
}

variable "az_count" {
  type        = number
  description = "Number of availability zones to use."
  default     = 2
}

variable "tags" {
  type        = map(string)
  description = "Additional tags for all resources."
  default     = {}
}

variable "waf_rate_limit_per_5_min" {
  type        = number
  description = "Maximum requests per IP over a rolling five-minute window before WAF blocks the source."
  default     = 2000
}

variable "backend_alb_full_name" {
  type        = string
  description = "CloudWatch LoadBalancer dimension for the backend ALB, for example app/name/id."
  default     = ""
}

variable "frontend_alb_full_name" {
  type        = string
  description = "CloudWatch LoadBalancer dimension for the frontend ALB, for example app/name/id."
  default     = ""
}

variable "observability_alert_email" {
  type        = string
  description = "Email address for CloudWatch alarm and budget notifications. Leave empty to skip email subscriptions."
  default     = ""
}

variable "monthly_budget_limit_usd" {
  type        = string
  description = "Monthly AWS budget limit in USD."
  default     = "50"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days for EKS Container Insights log groups."
  default     = 14
}

variable "github_repository" {
  type        = string
  description = "GitHub repository allowed to assume the Actions deployment role."
  default     = "pritesh-2711/poc2prod-production-deployment"
}

variable "allow_github_main_only" {
  type        = bool
  description = "Restrict GitHub OIDC role assumption to the main branch."
  default     = true
}
