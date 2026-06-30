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

