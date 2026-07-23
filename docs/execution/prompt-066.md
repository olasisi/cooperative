
# Prompt 066: Kubernetes Manifests

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Kubernetes manifests for namespace isolation, API deployment, service exposure, autoscaling, configuration, secrets, and TLS ingress.

## Kubernetes Manifests
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cooperative
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cooperative-api-config
  namespace: cooperative
data:
  NODE_ENV: "production"
  PORT: "3000"
  JWT_ACCESS_EXPIRES: "15m"
  JWT_REFRESH_EXPIRES: "30d"
---
apiVersion: v1
kind: Secret
metadata:
  name: cooperative-api-secrets
  namespace: cooperative
type: Opaque
stringData:
  DATABASE_URL: ******postgres:5432/cooperative?schema=public
  JWT_SECRET: replace-with-strong-secret
  JWT_REFRESH_SECRET: replace-with-strong-refresh-secret
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cooperative-api
  namespace: cooperative
spec:
  replicas: 2
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: cooperative-api
  template:
    metadata:
      labels:
        app: cooperative-api
    spec:
      containers:
        - name: cooperative-api
          image: ghcr.io/example/cooperative-api:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: cooperative-api-config
            - secretRef:
                name: cooperative-api-secrets
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: cooperative-api
  namespace: cooperative
spec:
  type: ClusterIP
  selector:
    app: cooperative-api
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cooperative-api
  namespace: cooperative
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cooperative-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cooperative-api
  namespace: cooperative
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-production
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.cooperative.example.com
      secretName: cooperative-api-tls
  rules:
    - host: api.cooperative.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: cooperative-api
                port:
                  number: 80
```

## Deployment Notes
- Namespace isolation separates cooperative workloads from cluster-shared services.
- Non-secret settings remain in ConfigMap; all credentials live in Secret.
- Two replicas satisfy basic HA and enable rolling updates.
- HPA targets 70% CPU utilization and can scale to 10 pods.
- TLS is terminated at ingress with HTTPS enforcement.
