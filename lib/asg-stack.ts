import fs = require("fs");
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';


export interface AsgStackProps extends cdk.StackProps {
    homeSubnets: string[];
}

export class AsgStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AsgStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
        tags: {["Name"]: "VPN-VPC"}
    })

    /**
     *  Create an EC2 SG that allows TCP and ICMP traffic from the home network
     */
    const sg = new ec2.SecurityGroup(this, "InstanceSg", {
      vpc: vpc,
      description: "instance SG",
      allowAllOutbound: true,
    });
    // allow inbound ICMP and all TCP from home networks
    props.homeSubnets.forEach((subnet, id) => {
      sg.addIngressRule(ec2.Peer.ipv4(subnet), ec2.Port.allIcmp(), `Ping from homeNet${id}`);
      sg.addIngressRule(ec2.Peer.ipv4(subnet), ec2.Port.allTcp(), `TCP from homeNet${id}`);
    });

    /**
     * Create an IAM role for the EC2 instance to use
     */
    const role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });
    /**
     * Set up userdata to install SSM agent and nginx
     */
    let userData = new String("");
    ["user-data-header", "ssm-agent-install", "nginx"].forEach((file) => {
      const data = fs.readFileSync("lib/userdata/" + file, "utf8");
      userData += data + "\n";
    });
    /**
     * Create an ASG with a single instance
     */
    const asg = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        onePerAz: true,
      },
      securityGroup: sg,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL),
      machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }),
      userData: ec2.UserData.custom(Buffer.from(userData.toString(), "binary").toString("base64")),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: autoscaling.BlockDeviceVolume.ebs(25, {
            volumeType: autoscaling.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      role: role,
      desiredCapacity: 1,
      minCapacity: 0,
      maxCapacity: 3,
      associatePublicIpAddress: true,
    });
    const asgResource = asg.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    asgResource.addPropertyOverride("Tags", [
      {
        "Key": "Name",
        "Value": "CDKVpn-demo/ASG",
        "PropagateAtLaunch": true,
      },
      {
        "Key": "app",
        "Value": "CDKVpn-demo",
        "PropagateAtLaunch": true,
      }
    ]);
 
  }
}
