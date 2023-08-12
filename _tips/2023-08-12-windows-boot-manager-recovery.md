---
layout: post
title:  "Windows Boot Manager recovery"
date:   2023-08-12
---

I'm currently running a dual-boot setup and I use linux as my main drive. Thus, Windows puts itself into the UEFI partition of that drive. If I switch to a new distro and wipe this drive for a new installation, the windows boot manager will be removed (because I don't do manual partitions).

Here is a handy article to recover that specific Windows Boot Manager: [How to restore an accidentally deleted Windows Boot Manager with a Windows / Arch Linux dual-boot installation](https://meroupatate.github.io/posts/bootloader/) ([Archive Version](https://web.archive.org/web/20220625174243/https://meroupatate.github.io/posts/bootloader/)).

This is an annoying solution, but it only needs to be done once and if you use systemd-boot the Windows entry will show right up at the next boot. And it is still better, than windows messing with the UEFI order and so on.