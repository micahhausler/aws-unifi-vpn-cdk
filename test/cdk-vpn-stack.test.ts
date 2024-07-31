import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkVpnStack } from '../lib/cdk-vpn-stack';

test('VPN Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkVpnStack(app, 'MyTestStack', {
        homeSubnets: [
            "192.168.1.0/24",
            "192.168.2.0/24",
        ],
        homeIPAddr: "8.8.8.8",
        vpcCidr: "10.100.0.0/20",
        env: {
            account: "111122223333",
            region: "us-west-2",
        }
    });
    // THEN
    const template = Template.fromStack(stack);

    template.hasResource("AWS::EC2::VPNConnection", {});
});
