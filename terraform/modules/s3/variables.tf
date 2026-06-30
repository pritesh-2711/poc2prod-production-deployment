variable "frontend_bucket_name" {
  type = string
}

variable "documents_bucket_name" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

