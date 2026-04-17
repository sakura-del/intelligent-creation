#!/bin/bash
set -euo pipefail

ACTIVE_FILE=".active_env"
COMPOSE_BLUE="docker-compose.blue.yml"
COMPOSE_GREEN="docker-compose.green.yml"
HEALTH_URL="http://localhost/health"
HEALTH_RETRIES=15
HEALTH_INTERVAL=5

get_active() {
    if [ -f "$ACTIVE_FILE" ]; then
        cat "$ACTIVE_FILE"
    else
        echo "blue"
    fi
}

get_inactive() {
    local active=$(get_active)
    if [ "$active" = "blue" ]; then echo "green"; else echo "blue"; fi
}

get_compose_file() {
    local env=$1
    if [ "$env" = "blue" ]; then
        echo "$COMPOSE_BLUE"
    else
        echo "$COMPOSE_GREEN"
    fi
}

wait_for_healthy() {
    local env=$1
    local compose_file=$(get_compose_file "$env")
    local port_var="${env^^}_PORT"
    local port=${!port_var:-80}

    echo "⏳ Waiting for $env environment to become healthy on port $port..."

    for i in $(seq 1 $HEALTH_RETRIES); do
        if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
            echo "✅ $env environment is healthy (attempt $i/$HEALTH_RETRIES)"
            return 0
        fi
        echo "   Attempt $i/$HEALTH_RETRIES - not ready yet..."
        sleep $HEALTH_INTERVAL
    done

    echo "❌ $env environment failed health check after $HEALTH_RETRIES attempts"
    return 1
}

switch_traffic() {
    local target=$1
    echo "🔀 Switching traffic to $target environment..."
    echo "$target" > "$ACTIVE_FILE"
    echo "✅ Traffic switched to $target"
}

rollback() {
    local failed_env=$1
    local original_env=$(get_active)
    echo "🔄 Rolling back - keeping traffic on $original_env"
    local failed_compose=$(get_compose_file "$failed_env")
    docker compose -f "$failed_compose" down 2>/dev/null || true
    echo "✅ Rollback complete. $failed_env environment stopped."
}

deploy() {
    local target=$(get_inactive)
    local current=$(get_active)
    local target_compose=$(get_compose_file "$target")

    echo "🚀 Blue-Green Deployment"
    echo "   Current: $current"
    echo "   Target:  $target"
    echo ""

    echo "📦 Pulling latest images..."
    docker compose -f "$target_compose" pull

    echo "🏗️ Starting $target environment..."
    docker compose -f "$target_compose" up -d --remove-orphans

    if ! wait_for_healthy "$target"; then
        echo "❌ Deployment failed - $target did not become healthy"
        rollback "$target"
        exit 1
    fi

    switch_traffic "$target"

    echo "🛑 Stopping old $current environment..."
    local current_compose=$(get_compose_file "$current")
    docker compose -f "$current_compose" down

    echo ""
    echo "✅ Deployment complete!"
    echo "   Active: $target"
}

status() {
    local active=$(get_active)
    echo "📊 Blue-Green Deployment Status"
    echo "   Active: $active"

    for env in blue green; do
        local compose_file=$(get_compose_file "$env")
        if docker compose -f "$compose_file" ps --quiet 2>/dev/null | grep -q .; then
            echo "   $env: running"
        else
            echo "   $env: stopped"
        fi
    done
}

case "${1:-}" in
    deploy)
        deploy
        ;;
    status)
        status
        ;;
    rollback)
        current=$(get_active)
        target=$(get_inactive)
        echo "🔄 Rolling back to $target..."
        switch_traffic "$target"
        local target_compose=$(get_compose_file "$target")
        docker compose -f "$target_compose" up -d --remove-orphans
        wait_for_healthy "$target"
        local current_compose=$(get_compose_file "$current")
        docker compose -f "$current_compose" down
        echo "✅ Rollback complete. Active: $target"
        ;;
    *)
        echo "Usage: $0 {deploy|status|rollback}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy to inactive environment and switch traffic"
        echo "  status   - Show current deployment status"
        echo "  rollback - Rollback to previous environment"
        exit 1
        ;;
esac
