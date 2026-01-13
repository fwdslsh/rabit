# Rabit Server Makefile

IMAGE_NAME ?= rabit/server
VERSION ?= 0.2.0

.PHONY: build run stop clean test logs help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker build -t $(IMAGE_NAME):$(VERSION) -t $(IMAGE_NAME):latest .

run: ## Run the server with sample docs
	docker compose up -d

run-build: ## Build and run
	docker compose up -d --build

stop: ## Stop the server
	docker compose down

logs: ## Show server logs
	docker compose logs -f

shell: ## Open a shell in the container
	docker compose exec rabit sh

clean: ## Remove containers and images
	docker compose down -v --rmi local

test: build ## Test the server
	@echo "Starting test container..."
	@docker run -d --name rabit-test \
		-p 18080:80 \
		-v $(PWD)/docs:/data/burrow:ro \
		-e RABIT_TITLE="Test Burrow" \
		$(IMAGE_NAME):latest
	@sleep 2
	@echo "\nTesting health endpoint..."
	@curl -s http://localhost:18080/health | jq .
	@echo "\nTesting manifest..."
	@curl -s http://localhost:18080/.burrow.json | jq '.manifest.title'
	@echo "\nCleaning up..."
	@docker stop rabit-test && docker rm rabit-test
	@echo "\nTests passed!"

publish: build ## Push to Docker Hub
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):latest

# Development targets
dev: ## Run in development mode with debug logging
	RABIT_LOG_LEVEL=debug docker compose up

dev-warren: ## Run in warren mode
	RABIT_MODE=warren CONTENT_DIR=./warren docker compose up
