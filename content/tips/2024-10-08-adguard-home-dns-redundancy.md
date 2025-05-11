---
layout: post
title:  "AdGuard Home DNS redundancy"
---

I like to make my most essential network services redudant, so in case I need to do some maintenance on one server or software, I still use my network without workarounds. DNS is one of those services, which I chose to host myself due to monitoring, blocking and privacy reasons. My main server for this due to the hardware and connectivity will be my Unraid Server and my Raspberry PI 4 running HomeAssistant will be the secondary fallback system.

As AdGuard Home is both available as an Unraid App and a HomeAssistant Add-On, it was my first choice (although I hosted Pi-Hole for years in the past).

Due to the router currently being provided by my internet provider, my easiest option to automatically set the default DNS entries in my network is to disable the built-in- DHCP Server and use the one provided by AdGuard itself. However, by default the DHCP Server in AdGuard only provides a single DNS IP to its clients. In my case, this means only the IP of my Unraid Server is provided without any redundancy.

However, after a little bit of search and browsing the documenttion, there is an easy, but manual fix, that can be implemented.

> **NOTE**: The following steps only need to be applied to the system with the DHCP Server enabled.

1. Locate the config file of your responsible AdGuard Home Service.
2. Stop the responsible AdGuard Home Service.
3. Make the following change to the configuration file ([config reference](https://github.com/AdguardTeam/AdGuardHome/wiki/DHCP#the-dhcpdhcpv4options-array-field)):

```diff
dhcp:
  enabled: true
  interface_name: eth0
  local_domain_name: lan
  dhcpv4:
    gateway_ip: 192.168.0.1
    subnet_mask: 255.255.255.0
    range_start: 192.168.0.100
    range_end: 192.168.0.200
    lease_duration: 86400
    icmp_timeout_msec: 0
-   options: []
+   options:
+     - 6 ips PRIMARY_DNS,SECONDARY_DNS
  dhcpv6:
    range_start: ""
    lease_duration: 86400
    ra_slaac_only: false
    ra_allow_slaac: false
# bunch of other stuff
```

Now, Save the changes and start the service again. Likely you will have to disconnect and connect again from your network to receive the changes on your device.

> **NOTE**: Every OS handles multiple DNS entries differently. But having two IPs or even three is still better than one.

Save the changes and start the AdGuard Home Service again and after a simple reconnect to update the DHCP infos your system should show now two DNS entries provided automatically by the DHCP.

### Hint in regards to IPv6

My Router does not provide any IPv6 Settings at all, but still provides all the relevant IPv6 functionalities. This means, devices where I cannot disable IPv6 for my home network, I will still get assigned the IPv6 Nameserver from my Internet Provider. Thereby, I still need to changes those manually where I can. Some devices, like my TV, don't allow me to do that at all.

A much better solution is always to get a good router that offers these functions out of the box without these hacky workarounds, but sometimes you need to use the things you have.