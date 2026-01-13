# Rabit Server - Build and Deployment Makefile
#
# Builds and publishes two official Docker images:
# - fwdslsh/rabit-server-nginx:latest (Nginx server with .well-known)
# - fwdslsh/rabit-server-git:latest (Git SSH server)

VERSION ?= 0.3.0
NGINX_IMAGE ?= fwdslsh/rabit-server-nginx
GIT_IMAGE ?= fwdslsh/rabit-server-git

.PHONY: help login build build-nginx build-git test test-nginx test-git publish publish-nginx publish-git clean

help: ## Show this help
	@echo "Rabit Server Build System"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

login: ## Login to Docker Hub (uses env vars, .env file, or interactive)
	@echo "Logging in to Docker Hub..."
	@if [ -n "$$DOCKERHUB_USERNAME" ] && [ -n "$$DOCKERHUB_TOKEN" ]; then \
		echo "Using credentials from environment variables (GitHub Actions)"; \
		echo $$DOCKERHUB_TOKEN | docker login -u $$DOCKERHUB_USERNAME --password-stdin; \
	elif [ -f .env ]; then \
		echo "Loading credentials from .env file (local)"; \
		export $$(cat .env | grep -v '^#' | xargs) && echo $$DOCKERHUB_TOKEN | docker login -u $$DOCKERHUB_USERNAME --password-stdin; \
	else \
		echo "No credentials found. Running interactive login..."; \
		docker login; \
	fi
	@echo "✓ Logged in to Docker Hub"

build: build-nginx build-git ## Build both images

build-nginx: ## Build Nginx server image
	@echo "Building Nginx server image..."
	cd nginx && docker build \
		-t $(NGINX_IMAGE):$(VERSION) \
		-t $(NGINX_IMAGE):latest \
		.
	@echo "✓ Built $(NGINX_IMAGE):$(VERSION)"

build-git: ## Build Git server image
	@echo "Building Git server image..."
	cd git && docker build \
		-t $(GIT_IMAGE):$(VERSION) \
		-t $(GIT_IMAGE):latest \
		.
	@echo "✓ Built $(GIT_IMAGE):$(VERSION)"

test: test-nginx test-git ## Test both images

test-nginx: build-nginx ## Test Nginx server image
	@echo "Testing Nginx server..."
	@mkdir -p /tmp/rabit-test-nginx
	@echo "# Test Document" > /tmp/rabit-test-nginx/README.md
	@echo "Test content" > /tmp/rabit-test-nginx/test.md

	@echo "Starting test container..."
	@docker run -d --name rabit-nginx-test \
		-p 18080:80 \
		-v /tmp/rabit-test-nginx:/data:ro \
		-e RABIT_TITLE="Test Burrow" \
		-e RABIT_AUTO_GENERATE=true \
		$(NGINX_IMAGE):latest

	@echo "Waiting for server to start..."
	@sleep 3

	@echo "Testing health endpoint..."
	@curl -sf http://localhost:18080/health | grep -q "healthy" || (echo "❌ Health check failed"; exit 1)

	@echo "Testing .well-known manifest generation..."
	@curl -sf http://localhost:18080/.well-known/burrow.json | grep -q "Test Burrow" || (echo "❌ Manifest test failed"; exit 1)

	@echo "Testing content serving..."
	@curl -sf http://localhost:18080/README.md | grep -q "Test Document" || (echo "❌ Content test failed"; exit 1)

	@echo "Cleaning up..."
	@docker stop rabit-nginx-test >/dev/null 2>&1 || true
	@docker rm rabit-nginx-test >/dev/null 2>&1 || true
	@rm -rf /tmp/rabit-test-nginx

	@echo "✓ Nginx server tests passed!"

test-git: build-git ## Test Git server image
	@echo "Testing Git server..."
	@mkdir -p /tmp/rabit-test-git/{repos,keys}
	@chmod 700 /tmp/rabit-test-git/keys

	@echo "Creating test repository..."
	@cd /tmp/rabit-test-git/repos && git init --bare test.git >/dev/null 2>&1

	@echo "Starting test container..."
	@docker run -d --name rabit-git-test \
		-p 2223:22 \
		-v /tmp/rabit-test-git/repos:/repos:ro \
		$(GIT_IMAGE):latest || (echo "❌ Failed to start Git server"; exit 1)

	@echo "Waiting for SSH server to start..."
	@sleep 3

	@echo "Testing SSH server is running..."
	@docker exec rabit-git-test pgrep sshd >/dev/null || (echo "❌ SSH daemon not running"; exit 1)

	@echo "Cleaning up..."
	@docker stop rabit-git-test >/dev/null 2>&1 || true
	@docker rm rabit-git-test >/dev/null 2>&1 || true
	@rm -rf /tmp/rabit-test-git

	@echo "✓ Git server tests passed!"

publish: login publish-nginx publish-git ## Publish both images to Docker Hub

publish-nginx: build-nginx test-nginx ## Publish Nginx server to Docker Hub
	@echo "Publishing Nginx server to Docker Hub..."
	docker push $(NGINX_IMAGE):$(VERSION)
	docker push $(NGINX_IMAGE):latest
	@echo "✓ Published $(NGINX_IMAGE):$(VERSION) and $(NGINX_IMAGE):latest"

publish-git: build-git test-git ## Publish Git server to Docker Hub
	@echo "Publishing Git server to Docker Hub..."
	docker push $(GIT_IMAGE):$(VERSION)
	docker push $(GIT_IMAGE):latest
	@echo "✓ Published $(GIT_IMAGE):$(VERSION) and $(GIT_IMAGE):latest"

clean: ## Remove test containers and images
	@echo "Cleaning up..."
	@docker stop rabit-nginx-test rabit-git-test 2>/dev/null || true
	@docker rm rabit-nginx-test rabit-git-test 2>/dev/null || true
	@docker rmi $(NGINX_IMAGE):$(VERSION) $(NGINX_IMAGE):latest 2>/dev/null || true
	@docker rmi $(GIT_IMAGE):$(VERSION) $(GIT_IMAGE):latest 2>/dev/null || true
	@rm -rf /tmp/rabit-test-nginx /tmp/rabit-test-git
	@echo "✓ Cleaned up"

inspect-nginx: ## Inspect Nginx server image
	docker inspect $(NGINX_IMAGE):latest

inspect-git: ## Inspect Git server image
	docker inspect $(GIT_IMAGE):latest

run-nginx-example: build-nginx ## Run Nginx server example
	@echo "Starting Nginx server example..."
	@mkdir -p /tmp/rabit-example
	@echo "# Example Documentation" > /tmp/rabit-example/README.md
	docker run --rm \
		-p 8080:80 \
		-v /tmp/rabit-example:/data:ro \
		-e RABIT_TITLE="Example Docs" \
		$(NGINX_IMAGE):latest
	@rm -rf /tmp/rabit-example

run-git-example: build-git ## Run Git server example
	@echo "Starting Git server example..."
	@echo "Note: You need to add SSH keys to ./git-example/authorized_keys"
	@mkdir -p ./git-example/{repos,keys}
	@touch ./git-example/keys/authorized_keys
	docker run --rm \
		-p 2222:22 \
		-v $(PWD)/git-example/repos:/repos:ro \
		-v $(PWD)/git-example/keys/authorized_keys:/home/git/.ssh/authorized_keys:ro \
		$(GIT_IMAGE):latest

logs-nginx: ## Show Nginx server logs
	docker logs -f rabit-nginx-test 2>/dev/null || echo "Nginx test container not running"

logs-git: ## Show Git server logs
	docker logs -f rabit-git-test 2>/dev/null || echo "Git test container not running"

shell-nginx: ## Open shell in Nginx server
	docker exec -it rabit-nginx-test sh 2>/dev/null || echo "Nginx test container not running. Run 'make test-nginx' first (in another terminal)."

shell-git: ## Open shell in Git server
	docker exec -it rabit-git-test sh 2>/dev/null || echo "Git test container not running. Run 'make test-git' first (in another terminal)."
