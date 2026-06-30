terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

locals {
  name_prefix      = "${var.project}-${var.environment}"
  account_id       = data.aws_caller_identity.current.account_id
  frontend_bucket  = "${local.name_prefix}-frontend-${local.account_id}"
  documents_bucket = "${local.name_prefix}-documents-${local.account_id}"

  common_tags = merge(
    var.tags,
    {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

module "vpc" {
  source = "../../modules/vpc"

  name_prefix          = local.name_prefix
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  az_count             = var.az_count
  tags                 = local.common_tags
}

module "ecr" {
  source = "../../modules/ecr"

  repository_name = "${local.name_prefix}-backend"
  tags            = local.common_tags
}

module "s3" {
  source = "../../modules/s3"

  frontend_bucket_name  = local.frontend_bucket
  documents_bucket_name = local.documents_bucket
  tags                  = local.common_tags
}

module "secrets" {
  source = "../../modules/secrets"

  app_secret_name = "${local.name_prefix}/app"
  tags            = local.common_tags
}

module "iam" {
  source = "../../modules/iam"

  name_prefix      = local.name_prefix
  documents_bucket = module.s3.documents_bucket_name
  tags             = local.common_tags
}

