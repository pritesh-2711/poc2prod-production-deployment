data "tls_certificate" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    data.tls_certificate.github_actions.certificates[0].sha1_fingerprint
  ]

  tags = var.tags
}

locals {
  github_subject = var.allow_github_main_only ? "repo:${var.github_repository}:ref:refs/heads/main" : "repo:${var.github_repository}:*"
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = [
      "sts:AssumeRoleWithWebIdentity"
    ]

    principals {
      type = "Federated"
      identifiers = [
        aws_iam_openid_connect_provider.github_actions.arn
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values = [
        "sts.amazonaws.com"
      ]
    }

    condition {
      test     = var.allow_github_main_only ? "StringEquals" : "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        local.github_subject
      ]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name_prefix}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

data "aws_iam_policy_document" "this" {
  statement {
    sid = "EcrAuth"

    actions = [
      "ecr:GetAuthorizationToken"
    ]

    resources = ["*"]
  }

  statement {
    sid = "EcrPushPull"

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:UploadLayerPart"
    ]

    resources = [
      var.backend_ecr_arn,
      var.frontend_ecr_arn,
      var.mcp_ecr_arn
    ]
  }

  statement {
    sid = "EksDescribeCluster"

    actions = [
      "eks:DescribeCluster"
    ]

    resources = [
      var.eks_cluster_arn
    ]
  }
}

resource "aws_iam_policy" "this" {
  name        = "${var.name_prefix}-github-actions"
  description = "Allows GitHub Actions to push images and deploy Poc2Prod workloads"
  policy      = data.aws_iam_policy_document.this.json
  tags        = var.tags
}

resource "aws_iam_role_policy_attachment" "this" {
  role       = aws_iam_role.this.name
  policy_arn = aws_iam_policy.this.arn
}
