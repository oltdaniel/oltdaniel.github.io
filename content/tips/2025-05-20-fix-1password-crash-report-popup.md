---
title: Fix 1Password Crash Report popup
layout: post
---

Using the 1Password Desktop Application on Linux has a very annoying side-effect:
Prompting you with a Crash Report Popup, when you first open the Application after
a fresh boot. You then need to first click ignore and then wait multiple seconds
before the actual application starts. This becomes annyoing really quickly
especially if you reboot often due to updates, OS specific changes or swichting
the OS in Dual Boot.

After some research in the depths of the Internet, some suggest to delete the
`~/.config/1Password/crashes/` folder on your system, as the client seems to
check on first start whether this folder exists and ask you if you want to
send the crash report to 1Password. This folder seems to be created after each
reboot, likely caused by not safely shutting down and interpreting it as some
sort of crash. Meaning, this is not a one time solution, but needs to be triggered
after each boot.

Quick and dirty solution to finally get rid of this annyoing behavior: **a oneshot
systemd service, deleting the folder in question after boot.**

## `$HOME/.local/share/systemd/user/1password-delete-crashes.service`
```systemd
[Unit]
Description=Remove 1Password Client crashes folder to prevent crash report popup on first open.

[Service]
Type=oneshot
RemainAfterExit=true
StandardOutput=journal
ExecStart=/usr/bin/rm -rf "%h/.config/1Password/crashes/"

[Install]
WantedBy=default.target
```

## Setup process

```bash
mkdir -p $HOME/.local/share/systemd/user
vim $HOME/.local/share/systemd/user/1password-delete-crashes.service
# Paste the service definition from above and exit
systemctl --user enable --now 1password-delete-crashes.service
systemctl --user status 1password-delete-crashes.service
# See if fixed after reboot
reboot
```
