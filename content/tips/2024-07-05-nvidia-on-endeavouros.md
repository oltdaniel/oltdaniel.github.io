---
layout: post
title:  "NVIDIA on EndeavourOS"
---

As mentioned in my previous post, I run linux and windows in dual boot. Currently EndeavourOS and Windows 11. Lately, I somehow messed up my Linux installation and had more and more graphics issue with unstable output and just a blackscreen instead of my systemd-boot menu.

So I finally took the time to reinstall Linux, and here are the steps (as of today), that worked for me to get EndeavourOS with NVIDIA running, even with hibernation:

1. **Drivers**: Choose the NVIDIA driver option in the installer boot menu. This will automatically install the drivers for you. Else, install `nvidia-inst` with `yay nvidia-inst` and execute as described in their blog post (here)[https://discovery.endeavouros.com/nvidia/new-nvidia-driver-installer-nvidia-inst/2022/03/]. **REBOOT**

2. **tty Output**: I decided not to go down the rabbithole and just accepted that the following command will fix tty output for the current driver: `sudo nvidia-installer-kernel-para nvidia-drm.fbdev=1 add` (mentioned somwhere (here)[https://wiki.archlinux.org/title/NVIDIA#DRM_kernel_mode_setting]). **REBOOT**

3. **Hibernation magic**: As described in the wiki (here)[https://wiki.archlinux.org/title/NVIDIA/Tips_and_tricks#Preserve_video_memory_after_suspend], the following commands are required:
    - `sudo nano /etc/modprobe.d/nvidia.conf` and add `options nvidia NVreg_PreserveVideoMemoryAllocations=1`.
    - enable all the following services: `sudo systemctl enable nvidia-suspend.service`, `sudo systemctl enable nvidia-hibernate.service` and `sudo systemctl enable nvidia-resume.service`.
    - **REBOOT**

#### Why are there still so many hops to jump through?

IDK

#### How long did this took you?

Couple of hours... again. The same battle every few years.

#### Why don't just use the open-source driver?

CUDA and other stuff. Also performance.

### Summary

```bash
# choose nvidia option during boot for installation
# => or install via `yay nvidia-inst` and following https://discovery.endeavouros.com/nvidia/new-nvidia-driver-installer-nvidia-inst/2022/03/
reboot

# Make tty work again
sudo nvidia-installer-kernel-para nvidia-drm.fbdev=1 add
reboot

# Hibernation magic
sudo nano /etc/modprobe.d/nvidia.conf
# => add 'options nvidia NVreg_PreserveVideoMemoryAllocations=1'
sudo systemctl enable nvidia-suspend.service
sudo systemctl enable nvidia-hibernate.service
sudo systemctl enable nvidia-resume.service
reboot
```