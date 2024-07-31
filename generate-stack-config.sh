#!/usr/bin/env bash

set -euo pipefail

config_file="stack-config.json"

get_value() {
  local description=$1
  local config_path=$2
  local default_value=$3

  local value=$default_value

  # Use the previous value if it is in the config file
  if [ -f "$config_file" ]; then
    local previous_value
    previous_value=$(jq -r "$config_path" "$config_file")
    if [ "$previous_value" != "null" ]; then
      value=$previous_value
    fi
  fi

  local entered_value
  read -er -p "$description [$value]: " entered_value

  # Use the value provided if there was one
  if [ -n "$entered_value" ]; then
    value=$entered_value
  fi

  # Fail if nothing was set
  if [ -z "$value" ]; then
    echo "Value is required" >&2
    exit 1
  fi

  echo "$value"
}

ACCOUNT_ID=$(get_value "Destination account number" ".account_id" "")
REGION=$(get_value "AWS Region where the devstack should be deployed" ".region" "us-west-2")
VPC_CIDR=$(get_value "VPC CIDR" ".vpcCidr" "10.100.1.0/20")
HOME_IP=$(get_value "Home IP address" ".homeIp" "")
create_instance=$(get_value "Create EC2 instance?" ".createInstance" "true")
if create_instance != "true"; then
  create_instance="false"
fi

if [ ! -f "$config_file" ]; then
    cat << EOF > $config_file
{
    "accountId": "$ACCOUNT_ID",
    "region": "$REGION",
    "vpcCidr": "$VPC_CIDR",
    "homeIp": "$HOME_IP",
    "createInstance": $create_instance,
    "onSiteCidrs": []
}
EOF

    echo "Created $config_file: ensure that ".onSiteCidrs" field has desired on-premise network ranges"
fi

