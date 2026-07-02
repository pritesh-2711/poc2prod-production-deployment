variable "name_prefix" {
  type = string
}

variable "documents_bucket" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
