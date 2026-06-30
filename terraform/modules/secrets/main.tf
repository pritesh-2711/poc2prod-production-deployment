resource "aws_secretsmanager_secret" "app" {
  name        = var.app_secret_name
  description = "Application runtime secrets for Poc2Prod production"
  tags        = var.tags
}

resource "aws_secretsmanager_secret_version" "app_placeholder" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    OPENAI_API_KEY              = "replace-me"
    JWT_SECRET_KEY              = "replace-me"
    DB_HOST                     = "replace-me"
    DB_PORT                     = "5432"
    DB_NAME                     = "poc2prod"
    DB_USER                     = "poc2prod"
    DB_PASSWORD                 = "replace-me"
    DB_SSL_MODE                 = "require"
    DB_SSL_ROOT_CERT            = ""
    REDIS_URL                   = "replace-me"
    AWS_S3_BUCKET               = "replace-me"
    AWS_S3_REGION               = "ap-south-1"
    MCP_SERVER_URL              = "http://poc2prod-mcp:8001/mcp"
    TAVILY_API_KEY              = ""
    E2B_API_KEY                 = ""
    ADMIN_EMAILS                = ""
    STORAGE_DEPLOYMENT          = "cloud"
    CLOUD_PROVIDER              = "aws"
    ENABLE_IN_PROCESS_SCHEDULER = "false"
    CORS_ORIGINS                = "https://poc2prod.pritesh-jha.in"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

