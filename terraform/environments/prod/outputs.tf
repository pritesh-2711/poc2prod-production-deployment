output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "backend_ecr_repository_url" {
  value = module.ecr.repository_url
}

output "frontend_ecr_repository_url" {
  value = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-frontend"
}

output "mcp_ecr_repository_url" {
  value = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}-mcp"
}

output "frontend_bucket_name" {
  value = module.s3.frontend_bucket_name
}

output "documents_bucket_name" {
  value = module.s3.documents_bucket_name
}

output "app_secret_name" {
  value = module.secrets.app_secret_name
}

output "documents_access_policy_arn" {
  value = module.iam.documents_access_policy_arn
}

output "github_actions_role_arn" {
  value = module.github_actions.role_arn
}

output "app_runtime_security_group_id" {
  value = module.security.app_runtime_security_group_id
}

output "aurora_cluster_endpoint" {
  value = module.aurora.cluster_endpoint
}

output "aurora_reader_endpoint" {
  value = module.aurora.reader_endpoint
}

output "rds_proxy_endpoint" {
  value = module.rds_proxy.endpoint
}

output "redis_endpoint" {
  value = module.elasticache.primary_endpoint_address
}

output "redis_url" {
  value = module.elasticache.redis_url
}

output "db_secret_name" {
  value = aws_secretsmanager_secret.db.name
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  value = module.eks.cluster_security_group_id
}

output "eks_node_group_name" {
  value = module.eks.node_group_name
}

output "eks_node_role_arn" {
  value = module.eks.node_role_arn
}

output "eks_oidc_issuer_url" {
  value = module.eks.oidc_issuer_url
}

output "eks_oidc_provider_arn" {
  value = module.eks_controllers.oidc_provider_arn
}

output "aws_load_balancer_controller_role_arn" {
  value = module.eks_controllers.aws_load_balancer_controller_role_arn
}

output "aws_load_balancer_controller_policy_arn" {
  value = module.eks_controllers.aws_load_balancer_controller_policy_arn
}

output "external_secrets_role_arn" {
  value = module.eks_controllers.external_secrets_role_arn
}

output "external_secrets_policy_arn" {
  value = module.eks_controllers.external_secrets_policy_arn
}

output "backend_role_arn" {
  value = module.eks_controllers.backend_role_arn
}

output "waf_web_acl_arn" {
  value = module.waf.web_acl_arn
}

output "waf_web_acl_name" {
  value = module.waf.web_acl_name
}

output "observability_dashboard_name" {
  value = module.observability.dashboard_name
}

output "observability_alarm_topic_arn" {
  value = module.observability.alarm_topic_arn
}
