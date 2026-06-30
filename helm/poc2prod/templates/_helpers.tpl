{{- define "poc2prod.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "poc2prod.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "poc2prod.labels" -}}
app.kubernetes.io/name: {{ include "poc2prod.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end -}}

{{- define "poc2prod.apiServiceAccountName" -}}
{{- if .Values.api.serviceAccount.create -}}
{{- default (printf "%s-api" (include "poc2prod.fullname" .)) .Values.api.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.api.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "poc2prod.apiImage" -}}
{{- printf "%s:%s" .Values.api.image.repository .Values.api.image.tag -}}
{{- end -}}

{{- define "poc2prod.jobImage" -}}
{{- printf "%s:%s" (default .Values.api.image.repository .Values.cronjobs.image.repository) (default .Values.api.image.tag .Values.cronjobs.image.tag) -}}
{{- end -}}

