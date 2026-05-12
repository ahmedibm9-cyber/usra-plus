#!/bin/bash
# Keepalive - pings the server every 10s to prevent idle kill
while true; do
  curl -s -o /dev/null http://localhost:3000/ 2>/dev/null
  sleep 10
done
