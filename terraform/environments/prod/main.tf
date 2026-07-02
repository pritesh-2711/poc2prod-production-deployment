terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
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

resource "random_password" "db_master" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name_prefix}/db"
  description             = "Database credentials for Poc2Prod ${var.environment}"
  recovery_window_in_days = 30

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    username = "poc2prod_admin"
    password = random_password.db_master.result
  })
}

module "security" {
  source = "../../modules/security"

  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id

  tags = local.common_tags
}

module "aurora" {
  source = "../../modules/aurora"

  project     = var.project
  environment = var.environment

  database_name   = "poc2prod"
  master_username = "poc2prod_admin"
  master_password = random_password.db_master.result

  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security.aurora_security_group_id

  tags = local.common_tags

  depends_on = [
    module.security
  ]
}

module "rds_proxy" {
  source = "../../modules/rds-proxy"

  project     = var.project
  environment = var.environment

  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security.rds_proxy_security_group_id

  db_cluster_id = module.aurora.cluster_id
  db_secret_arn = aws_secretsmanager_secret.db.arn
  db_username   = "poc2prod_admin"

  tags = local.common_tags

  depends_on = [
    module.aurora,
    aws_secretsmanager_secret_version.db
  ]
}

module "elasticache" {
  source = "../../modules/elasticache"

  project     = var.project
  environment = var.environment

  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security.redis_security_group_id

  tags = local.common_tags

  depends_on = [
    module.security
  ]
}

module "eks" {
  source = "../../modules/eks"

  name_prefix        = local.name_prefix
  kubernetes_version = "1.30"
  private_subnet_ids = module.vpc.private_subnet_ids

  node_instance_types = ["t3.large"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 4

  endpoint_public_access  = true
  endpoint_private_access = true
  public_access_cidrs     = ["0.0.0.0/0"]

  tags = local.common_tags
}

resource "aws_security_group_rule" "eks_to_rds_proxy" {
  type                     = "ingress"
  description              = "Allow EKS workloads to reach RDS Proxy"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.security.rds_proxy_security_group_id
  source_security_group_id = module.eks.cluster_security_group_id
}

resource "aws_security_group_rule" "eks_to_redis" {
  type                     = "ingress"
  description              = "Allow EKS workloads to reach Redis"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = module.security.redis_security_group_id
  source_security_group_id = module.eks.cluster_security_group_id
}

module "eks_controllers" {
  source = "../../modules/eks-controllers"

  name_prefix     = local.name_prefix
  cluster_name    = module.eks.cluster_name
  oidc_issuer_url = module.eks.oidc_issuer_url

  aws_load_balancer_controller_policy_path = "${path.module}/../../policies/aws-load-balancer-controller-policy.json"

  app_secret_arn = module.secrets.app_secret_arn
  db_secret_arn  = aws_secretsmanager_secret.db.arn

  documents_access_policy_arn = module.iam.documents_access_policy_arn

  backend_namespace            = "poc2prod"
  backend_service_account_name = "poc2prod-backend"

  tags = local.common_tags

  depends_on = [
    module.eks
  ]
}

module "github_actions" {
  source = "../../modules/github-actions"

  name_prefix            = local.name_prefix
  github_repository      = var.github_repository
  backend_ecr_arn        = module.ecr.repository_arn
  frontend_ecr_arn       = "arn:aws:ecr:${var.aws_region}:${local.account_id}:repository/${local.name_prefix}-frontend"
  mcp_ecr_arn            = "arn:aws:ecr:${var.aws_region}:${local.account_id}:repository/${local.name_prefix}-mcp"
  eks_cluster_arn        = module.eks.cluster_arn
  allow_github_main_only = var.allow_github_main_only
  tags                   = local.common_tags
}

module "waf" {
  source = "../../modules/waf"

  name_prefix          = local.name_prefix
  rate_limit_per_5_min = var.waf_rate_limit_per_5_min
  tags                 = local.common_tags
}

module "observability" {
  source = "../../modules/observability"

  name_prefix       = local.name_prefix
  aws_region        = var.aws_region
  cluster_name      = module.eks.cluster_name
  eks_node_role_arn = module.eks.node_role_arn

  backend_alb_full_name  = var.backend_alb_full_name
  frontend_alb_full_name = var.frontend_alb_full_name

  aurora_cluster_identifier  = module.aurora.cluster_id
  redis_replication_group_id = module.elasticache.replication_group_id
  waf_web_acl_name           = module.waf.web_acl_name

  alert_email              = var.observability_alert_email
  monthly_budget_limit_usd = var.monthly_budget_limit_usd
  log_retention_days       = var.log_retention_days

  tags = local.common_tags
}
