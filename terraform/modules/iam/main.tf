data "aws_iam_policy_document" "documents_access" {
  statement {
    sid = "DocumentsBucketObjectAccess"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = [
      "arn:aws:s3:::${var.documents_bucket}/*",
    ]
  }

  statement {
    sid = "DocumentsBucketListAccess"

    actions = [
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${var.documents_bucket}",
    ]
  }
}

resource "aws_iam_policy" "documents_access" {
  name        = "${var.name_prefix}-documents-access"
  description = "Allows backend pods to read and write production documents"
  policy      = data.aws_iam_policy_document.documents_access.json
  tags        = var.tags
}
