# Our Journey to Kubernetes

*Published: December 15, 2024 | Author: Sam Okonkwo, Platform Engineer*

After 2 years on AWS ECS, we've completed our migration to Kubernetes. Here's why and how.

## Why Kubernetes?

### The Good Parts of ECS

ECS served us well. It's simple, integrates nicely with AWS, and just works. For many teams, it's the right choice.

### Where We Hit Limits

As we grew, we needed:

- **Multi-cloud capability** for disaster recovery
- **Better local development** parity with production
- **Richer ecosystem** for observability and security
- **Standardization** with our enterprise customers

## The Migration

### Phase 1: Proof of Concept (2 months)

We started with non-critical internal services. Key learnings:

- Helm charts are worth the complexity
- Start with managed Kubernetes (we use EKS)
- Invest in CI/CD early

### Phase 2: Stateless Services (4 months)

Migrated all stateless application services:

- API servers
- Background workers
- Cron jobs

### Phase 3: Stateful Services (3 months)

The hard part. We migrated:

- Redis (using Redis Operator)
- PostgreSQL (using CloudNativePG)
- Elasticsearch (using ECK)

### Phase 4: Cutover (1 month)

Blue-green deployment with gradual traffic shift:

- Week 1: 10% traffic
- Week 2: 50% traffic
- Week 3: 90% traffic
- Week 4: 100% + decommission ECS

## What We'd Do Differently

1. **Start with GitOps from day one.** We retrofitted ArgoCD later.
2. **Standardize resource requests earlier.** We had noisy neighbor problems.
3. **Invest more in developer tooling.** Local K8s is still painful.

## Current Stack

- **EKS** for managed Kubernetes
- **ArgoCD** for GitOps
- **Prometheus + Grafana** for observability
- **Cilium** for networking
- **Kyverno** for policy enforcement

## Was It Worth It?

Yes. Deployment frequency is up 3x, and we now have consistent infrastructure across AWS, GCP, and on-prem customer deployments.

But it's not free. Kubernetes is complex. Make sure you have the team to support it.
