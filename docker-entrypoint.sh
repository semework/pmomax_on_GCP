#!/bin/sh
set -e

# Default port if not provided
: "${PORT:=8080}"

# Substitute PORT into the nginx template
envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Exec nginx (or whatever CMD was passed)
exec "$@"