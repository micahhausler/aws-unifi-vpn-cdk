#!/usr/bin/env node
import * as fs from "fs";
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkVpnStack } from '../lib/cdk-vpn-stack';
import { AsgStack } from '../lib/asg-stack';


const app = new cdk.App();

export interface VPNStackConfig {
    // AWS Account ID to use
    accountId: string;

    // on-site networks to make routable to the VPC
    onSiteCidrs: string[];

    // AWS region to deploy to 
    region: string;

    // The VPC CIDR to use
    vpcCidr: string;

    // The home IP to connect to
    homeIp: string;

    // Create an EC2 Instance
    createInstance: boolean;
}

if (!fs.existsSync("stack-config.json")) {
    throw new Error("Missing 'stack-config.json' file");
}
const stackConfig: VPNStackConfig = JSON.parse(
    fs.readFileSync("stack-config.json", "utf-8")
);

if (!stackConfig.accountId) {
    throw new Error(
    "'stack-config.json' is missing required '.account_id' property"
    );
}

if (!stackConfig.region) {
    throw new Error(
    "'stack-config.json' is missing required '.region' property"
    );
}

if (!stackConfig.vpcCidr) {
    throw new Error(
        "'stack-config.json' is missing required '.vpcCidr' property"
    );
}

if (!stackConfig.homeIp) {
    throw new Error(
        "'stack-config.json' is missing required '.homeIp' property"
    );
}

if (!stackConfig.onSiteCidrs || stackConfig.onSiteCidrs.length == 0 ) {
    throw new Error(
        "'stack-config.json' is missing required '.onSiteCidrs' property"
    );
}


const vpnStack = new CdkVpnStack(app, 'CdkVpnStack', {
    homeSubnets: stackConfig.onSiteCidrs,
    homeIPAddr: stackConfig.homeIp,
    vpcCidr: stackConfig.vpcCidr,
    env: {
        account: stackConfig.accountId, 
        region: stackConfig.region,
    }
});

if (stackConfig.createInstance) {
    new AsgStack(app, 'AsgStack', {
        homeSubnets: stackConfig.onSiteCidrs,
        env: {
            account: stackConfig.accountId,
            region: stackConfig.region,
        }
    });
}