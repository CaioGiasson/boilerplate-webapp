#!/usr/bin/env bash
set -euo pipefail

# Windows bind mounts cannot enforce chmod 400; copy keyfile into the volume at startup.
if [[ -f /etc/mongo-keyfile ]]; then
	cp /etc/mongo-keyfile /data/configdb/mongo-keyfile
	chmod 400 /data/configdb/mongo-keyfile
fi

exec docker-entrypoint.sh "$@"
