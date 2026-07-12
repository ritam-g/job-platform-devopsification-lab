# 🌐 Homelab Architecture

This repository is deployed behind **Cloudflare Tunnel** instead of exposing the server directly to the Internet.

The goal of this setup is to build a reusable production-like environment for breaking and building:

- Docker
- Kubernetes
- GitOps
- Monitoring
- SRE
- Cloud Networking

---

## Architecture

```
                    Browser
                       │
                       ▼
              jobportal.sarkar.codes
                       │
                       ▼
                Cloudflare DNS
                       │
                       ▼
              Cloudflare Global Edge
                       │
                       ▼
              Cloudflare Tunnel
                       │
           (Outbound connection only)
                       │
                       ▼
               localhost:80
                       │
                       ▼
                    NGINX
                  /        \
                 /          \
                ▼            ▼
         Next.js (3000)   API (5000)
```

---

## Components

### 1. Domain Registrar

**Provider**

```
Name.com
```

**Purpose**

Owns the domain.

```
sarkar.codes
```

A registrar only manages ownership of the domain. It does **not** host the website.

---

### 2. DNS Provider

**Provider**

```
Cloudflare
```

**Purpose**

Answers DNS queries.

Example:

```
jobportal.sarkar.codes
```

Instead of pointing to a public IP, Cloudflare points it to a Tunnel.

---

### 3. Cloudflare Tunnel

Service running on the Ubuntu server.

```
cloudflared
```

**Purpose**

Creates an encrypted outbound connection from the server to Cloudflare. No inbound ports are required.

Instead of:

```
Internet
      ↓
Public IP
```

It becomes:

```
Internet
      ↓
Cloudflare
      ↓
Tunnel
      ↓
localhost
```

The server initiates the connection. Cloudflare never needs direct access to the machine.

---

### 4. NGINX

Runs locally.

Receives traffic from:

```
localhost:80
```

Then forwards requests:

```
/       → Next.js
/api    → Backend
```

Example:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
}

location /api/ {
    proxy_pass http://127.0.0.1:5000;
}
```

---

### 5. Application

**Frontend**

```
Next.js
```

**Backend**

```
Node.js
```

Managed using:

```
PM2
```

**Future**

```
Docker
```

**Eventually**

```
Kubernetes (KIND)
```

---

## Why Cloudflare Tunnel?

**Traditional deployment**

```
Browser
      │
      ▼
 Public IP
      │
      ▼
 Router
      │
      ▼
 NGINX
      │
      ▼
 Application
```

Problems:

- Public IP exposed
- Need port forwarding
- Firewall configuration
- SSL management
- Higher attack surface

**Cloudflare Tunnel**

```
Browser
      │
      ▼
Cloudflare Edge
      │
      ▼
Encrypted Tunnel
      │
      ▼
localhost:80
      │
      ▼
NGINX
      │
      ▼
Application
```

Advantages:

- No exposed public IP
- No inbound ports required
- Automatic TLS
- DDoS protection
- WAF
- Easier DNS management

---

## Current Deployment

```
Browser
    │
    ▼
jobportal.sarkar.codes
    │
    ▼
Cloudflare DNS
    │
    ▼
Cloudflare Tunnel
    │
    ▼
NGINX
    │
 ┌──┴─────────────┐
 ▼                ▼
Next.js       Express API
3000            5000
```

---

## Planned Architecture

1. Current: `PM2`
2. Docker
3. Docker Compose
4. Kubernetes (KIND)
5. ArgoCD
6. Prometheus
7. Grafana
8. Loki
9. Tempo
10. Production Kubernetes

---

## Planned Subdomains

```
jobportal.sarkar.codes
grafana.sarkar.codes
prometheus.sarkar.codes
rabbitmq.sarkar.codes
jaeger.sarkar.codes
argocd.sarkar.codes
api.sarkar.codes
loki.sarkar.codes
tempo.sarkar.codes
kibana.sarkar.codes
docs.sarkar.codes
status.sarkar.codes
```

Each service will receive:

```
Subdomain
        │
        ▼
Cloudflare Tunnel
        │
        ▼
NGINX
        │
        ▼
Application
```

---

## Learning Timeline

- [x] Registered domain
- [x] Delegated DNS to Cloudflare
- [x] Understood registrar vs DNS
- [x] Installed Cloudflare Tunnel
- [x] Connected Ubuntu server
- [x] Routed traffic through NGINX
- [x] Served application using custom domain
- [ ] Docker
- [ ] Docker Compose
- [ ] Kubernetes
- [ ] Ingress
- [ ] GitOps
- [ ] Observability
- [ ] Production-grade deployment

---

## Lessons Learned

A domain registrar, DNS provider, reverse proxy, and Cloudflare Tunnel all solve different problems.

| Component | Responsibility |
|---|---|
| **Registrar** | Owns the domain. |
| **DNS** | Knows where traffic should go. |
| **Cloudflare Tunnel** | Securely transports traffic to the server. |
| **NGINX** | Decides which application receives the request. |

The application itself remains unaware of how users reached it.

```
Browser
      ↓
Cloudflare
      ↓
Tunnel
      ↓
NGINX
      ↓
Application
```

Understanding these responsibilities was more valuable than simply making the deployment work.
