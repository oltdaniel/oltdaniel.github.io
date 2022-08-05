---
title: "Flatpak chromium browser gpu acceleration"
date: 2022-08-05
tags: ["linux", "flatpak", "chromium"]
---

This is a small tip on how to ensure your browser has gpu acceleration enabled on your linux machine, especially in the case of chromium based browsers installed via flatpak. Other installation methods are often already well documented via the Arch Wiki or similar.

### Check GPU status

First, we check the browser gpu info. First, open the browser settings. In the URL you should see something like `BROWSER://settings`. In my case, running Brave, I have `brave://settings`. If I replace `settings` with `gpu`, it will automatically redirect me to the base information about which parts of the browser engine are GPU accelerated.

If there is any field mentioning `Software only`, you should continue with this post.

### Find the config file

As many people using flatpak, often don't even realize they use it, the understanding of where files life is missing. I'm new to flatpak, but used Manjaro Linux for years and know my way around where certain configs life. But in case of flatpak, it was really hard to find some good info for specific problems.

In short, the config we need to change, in my case for Brave, can be found in `~/.var/app/com.brave.Browser/config/brave-flags.conf`. If not installed via flatpak it would life in `~/.config/brave-flags.conf`. Anyway, no open it with your text editor (the file probably doesn't exist yet).

### Which flags to set?

Which flags you need to set, can be extremly different depending on your OS. In my case, running Pop_OS! with X11, I only added the following:

```
--use-gl=desktop
--enable-features=VaapiVideoDecoder
```

The Arch Wiki has some good explanations on which flags to use, see [here](https://wiki.archlinux.org/title/Chromium#Hardware_video_acceleration). 

### Isn't `brave://flags` enough?

No, it's now. Somehow this kind of flags are only exposed through the command line, causing this amount of trouble. I have some other flags set via `brave://flags` as well, as shown here:

![](/tips/flatpak-chromium-browser-gpu-acceleration/additional-flags.png)

![](/tips/flatpak-chromium-browser-gpu-acceleration/gpu-status.png)

### Summary

With these few changes, videos on YouTube in higher quality should run a lot smoother and shouldn't affect any other open windows in their rendering performance. Always check the YouTube Nerd Statistics (right click on the video), for dropped frames.