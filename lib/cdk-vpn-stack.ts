import fs = require("fs");
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface VpnStackProps extends cdk.StackProps {
  homeSubnets: string[];

  homeIPAddr: string;

  vpcCidr: string;
}

export class CdkVpnStack extends cdk.Stack {
  
  constructor(scope: Construct, id: string, props: VpnStackProps) {
    super(scope, id, props);

    /**
     * Create the VPC
     */
    const vpc = new ec2.Vpc(this, "StackVPC", {
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PUBLIC,
          name: 'Ingress',
          cidrMask: 24,
        },
      ],
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
    });
    cdk.Tags.of(vpc).add("Name", "VPN-VPC")

    new cdk.CfnOutput(this, "VpcId", { value: vpc.vpcId })

    /**
     * Create the VPN connection
     */
    const vpnConnection = vpc.addVpnConnection('Static', {
      ip: props.homeIPAddr,
      staticRoutes: props.homeSubnets,
    });
    // The returned construct doesn't have the gateway ID on the structure, 
    // we need the Cfn representation which does for the route table routes.
    const cfnVpnConn = vpnConnection.node.defaultChild as ec2.CfnVPNConnection;

    // Add route tables routes for each home network to vpnGW
    vpc.publicSubnets.forEach((subnet, index)=> {
      let routeTableID = subnet.routeTable.routeTableId;
      
      props.homeSubnets.forEach((homeNet, homeIndex) => {
        let route = new ec2.CfnRoute(this, `PublicSubnet${index}PeeringConnectionRoute${homeIndex}`, {
          destinationCidrBlock: homeNet,
          routeTableId: routeTableID,
          gatewayId: cfnVpnConn.vpnGatewayId,
        })
        // Ensure routes don't get added until after VPN connection is ready
        route.addDependency(cfnVpnConn)
      });
      new cdk.CfnOutput(this, `SubnetId${index}Output`, { value: subnet.subnetId  })
      new cdk.CfnOutput(this, `Subnet${index}CIDR`, { value: subnet.ipv4CidrBlock  })
    });

    // Display the VPN conn ID
    new cdk.CfnOutput(this, "VpnConnectionId", { value: vpnConnection.vpnId })

  }
}
