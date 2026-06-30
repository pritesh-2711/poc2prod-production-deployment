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

