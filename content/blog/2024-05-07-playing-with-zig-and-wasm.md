---
layout: post
title: "Playing with zig and wasm"
description: Recently I started to play around with wasm for a project of mine and I wanted to explore how zig would do compared to other low-level options.
---

I always wanted to do something with zig, but never really had the time or project in mind for it. Recently I started to play around with wasm for a project of mine and I wanted to explore how zig would do compared to other low-level options.

> Too lazy to read, show me the code already: [oltdaniel/zig-wasm-example](https://github.com/oltdaniel/zig-wasm-example){:target="_blank"}.

## Before we get started

WASM is low-level. I mean even the name already includes "assembly". But being naive because "it can run in the browser and interfaces with JS", I thought you can just throw data around like its nothing. But WASM won't understand what JS throws at it. You need to start thinking "low-level like" directly from the JS in order to understand the interface.

Now, before we go deeper. Disclaimer: I'm not a WASM expert nor a Zig expert. This is just scratching the surface of a rough idea on how to abstract the "low-levelness" away from WASM in an JS environment. By no means is this a optimal solution.

## Setting up zig

> I'm running the latest zig version at this time, `v0.13.0`.

First we initialize a new zig project with `zig init`. Then we simply replace the complete body of `pub fn build(b: *std.Build) void` in `build.zig`. The reason for this is, that the WASM target is not really something default and nobody wants to pass a dozen parameters every time (I mean that is literally one of the reasons `build.zig` exists).

### Defining the WASM target

Currently the majority of browsers support WASM in 32bit with some basics WASM features. You can read about all the different kinds of features [here](https://webassembly.org/features/){:target="_blank"} and also check if your environment supports it. I will also just keep the comments from @andrewrk as he knows a lot more about this than me. However, the feature coverage will definitly change over time.

> Source: [codeberg.org/andrewrk/player](https://codeberg.org/andrewrk/player/src/commit/3e84496958dd75654cec915c4f6feddf30e772b7/build.zig#L7){:target="_blank"}

```zig
const wasm_target = b.resolveTargetQuery(.{
    .cpu_arch = .wasm32,
    .os_tag = .freestanding,
    .cpu_features_add = std.Target.wasm.featureSet(&.{
        .atomics,
        .bulk_memory,
        // .extended_const, not supported by Safari
        .multivalue,
        .mutable_globals,
        .nontrapping_fptoint,
        .reference_types,
        //.relaxed_simd, not supported by Firefox or Safari
        .sign_ext,
        // observed to cause Error occured during wast conversion :
        // Unknown operator: 0xfd058 in Firefox 117
        .simd128,
        // .tail_call, not supported by Safari
    }),
});
```

### Define the wasm executable

This one is mainly the default `b.addExecutable` from the initilization. However, note the change to our previosly written `wasm_target` and the hardcoded `.ReleaseSmall` for optimizations. Personally, I will always choose `.ReleaseSmall`  due to the huge size increases when using `.ReleaseFast` or even a considerable increase when using `.ReleaseFast`, something you don't really want when loading the WASM on a website.

```zig
// ...
const wasm = b.addExecutable(.{
    .name = "main",
    // In this case the main source file is merely a path, however, in more
    // complicated build scripts, this could be a generated file.
    .root_source_file = b.path("src/wasm.zig"),
    .target = wasm_target,
    .optimize = .ReleaseSmall,
});
```

In addition to the target itself, we need to make some customizations in order for the compilation to work as expected.
1. **Disabling entry**: As we use our WASM as a library, there won't be any entry function like `main` for the compiler and linker to detect. So we will disable this it.
2. **Exposing exported functions**: Again, due to our library like way of using the WASM binary, we need to tell the compiler and linker to note that.
3. **Memory options**: There are more options that we won't discuss here, that will allow you to customize the memory things for your WASM binary. Here is a short list (`global_base`, `import_memory`, `stack_size`, `initial_memory`, `max_memory`, ...).

The bare minimum we need to set in order to make this work for us is as follows:
```zig
wasm.entry = .disabled; // disables entry point
wasm.rdynamic = true; // expose exported functions to wasm
```

### Output to our target folder

Because I'm still very new to zig, I took the example line that did exactly what I wanted to throw it into a custom folder called `www`.

> Source [codeberg.org/andrewrk/player](https://codeberg.org/andrewrk/player/src/commit/3e84496958dd75654cec915c4f6feddf30e772b7/build.zig#L159){:target="_blank"}

```zig
b.getInstallStep().dependOn(&b.addInstallFile(wasm.getEmittedBin(), "../www/main.wasm").step);
```

## Compiling our first example

We can delete all files in `src` and create a new one as `src/wasm.zig`, was define as a source in our WASM target. The bare minimum example of a WASM functions is often just a `add(a, b)` function, as this only exchanges numbers for which we don't require any abstractions. So, we write the code as follows:

```zig
export fn add(a: u32, b: u32) u32 {
    return a + b;
}
```

Now we just compile it with `zig build`, and we should have our first WASM binary. If we use a tool like [wasm2wat](https://webassembly.github.io/wabt/demo/wasm2wat/){:target="_blank"} in order to translate our binary representation of WASM to an text-based one, we should have something like this:

```
(module
  (type $t0 (func (param i32 i32) (result i32)))
  (func $add (export "add") (type $t0) (param $p0 i32) (param $p1 i32) (result i32)
    (i32.add
      (local.get $p1)
      (local.get $p0)))
  (memory $memory (export "memory") 16)
  (global $g0 (mut i32) (i32.const 1048576)))
```

You can easily see where our `add` function is and even how it workds. Around it, are just some WASM environment stuff like exporting the memory and some constant. Something we don't really care about for now in our simple example use case.

> I won't go into any details here on what the different ways of loading a WASM binary are. But [here](https://developer.mozilla.org/en-US/docs/WebAssembly/Loading_and_running){:target="_blank"} is a MDN reference that explains it all with examples.

In order to call this function, you would likely write a small HTML file `www/index.html` like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <script type="module">
        WebAssembly.instantiateStreaming(fetch("./main.wasm")).then(mod => {
            const { add } = mod.instance.exports;
            console.log(add(1, 3))
        })
    </script>
</body>
</html>
```

Tada, we have a `4` in our console. That was super easy!

## Beyond numbers

Numbers are always easy. They just have a simple size (and endianness). Nothing fancy related to memory (expect advanced use-cases).

Now lets strat using strings, a way more advanced data type. And now stuff stops being "easy", as we need to start interacting with memory. This feels like the same experience as in C, where everything is relativley easy until you need to copy around string data.

### Simple console.log from Zig

The WASM Interface in the browser allows us to pass along an import object for stuff that is exposed to the WASM binary and can be called/read from there. So, lets expose the `console.log`, so we can log a hello message from our `add` function:

#### Preparing our JS

```js
const importEnv = {
    js: {
        log(message) {
            console.log(message)
        }
    }
}

WebAssembly.instantiateStreaming(fetch("./main.wasm"), importEnv).then(mod => {
    const { add } = mod.instance.exports;
    console.log(add(1, 3))
})
```

Now we simply "import" it into our Zig environment and write a little hello message in our `add` function:

```zig
// External functions that are hooked in from the JS enviornment.
const js = struct {
    extern "js" fn log(arg: [*]u8) void;
};

export fn add(a: u32, b: u32) u32 {
    js.log("Hello from Zig!");
    return a + b;
}
```

We compile it again with `zig build`, refresh our page and... Mhm. Now we have two numbers?

```
1048576
4
```

But wait, I recognize `1048576` from before in the text-based representation of our previous WASM file. Correct! This the the memory address of our data in the binary. If we look into our current WASM binary with the same tool, we will get the following code:

```
(module
  (type $t0 (func (param i32)))
  (type $t1 (func (param i32 i32) (result i32)))
  (import "js" "log" (func $js.log (type $t0)))
  (func $add (export "add") (type $t1) (param $p0 i32) (param $p1 i32) (result i32)
    (call $js.log
      (i32.const 1048576))
    (i32.add
      (local.get $p1)
      (local.get $p0)))
  (memory $memory (export "memory") 17)
  (global $g0 (mut i32) (i32.const 1048576))
  (data $d0 (i32.const 1048576) "Hello from Zig!\00"))
```

This means, we just receive the pointer from our WASM environment and need to read the memory to actually get our text message for the console. Before we do that, you might already realize, there is currently no way of telling whether this is a pointer, just a number or anything else.

In a language like C or Zig, we have data types at compile time to tell the difference and make interaction at least somewhat safe. Thanks to the nature of JS, that falls completly overboard. When compiling Rust to WASM, most people use use `wasm-pack`, which will generate you the correct JS code for the corresponding Rust functions you exported. As we don't have that layer here, we need to manage this on our own.

Now, back to our `console.log` message. First, we need to get access to the memory of the WASM environment. This is easy, as we can just access it in the exports under the name `memory` (you can also see that in the text-based WASM file above). Then we just read the bytes until we read `\00` and print out our string.

The code will look like this:

```js
// Keep a reference here for our importEnv
let wasmMemory;
const importEnv = {
    js: {
        log(messagePtr) {
            // Create a byte based view of the pointers memory
            const msgBuf = new Uint8Array(wasmMemory.buffer, messagePtr);
            // Some temporary variables for reading
            let message = "", pos = 0;
            // Read until null terminator hit
            while (msgBuf[pos] !== 0) {
                // Add the character at the position and increase position for next iteration
                message += String.fromCharCode(msgBuf[pos++]);
            }
            // Print our read string from memory
            console.log(message)
        }
    }
}

WebAssembly.instantiateStreaming(fetch("./main.wasm"), importEnv).then(mod => {
    const { add, memory } = mod.instance.exports;
    // Remember the imported memory object
    wasmMemory = memory;

    console.log(add(1, 3))
})
```

If we refresh our page now... Tada! `Hello from Zig!`, success!

### Sending a string to zig

Because this article is already far longer than I wanted it to be, I will keep it short and spoiler you a bit.

If we add a call to our add function and just for the sakes of it, pass a string instead of an number (which we ca ndo with no issues), we simply get a `0` back. There is just no interface for JS strings to be "just thrown at a WASM call". You need to alocate space in the WASM environment, copy the string to it and pass the pointer to the function. This is nearly identical to the way we did it the other way around.

### Exchaning data has become less trivial

As you can tell by our rather simple example, handling data between WASM and JS has become a lot less trivial. We now need to know exactly what type we receive in our JS environment in order to be able to correctly read its actual value. Additionally, everything goes through the WASM memory and only JS can access both its own memory and the WASM environments memory.

## The solution

The example shows, that the more stuff we do and the more complicated calls we have, a lot more code need sto be built around every single call in order to properly work. All the high-level features we gained from using JS get completly lost if we throw WASM in the mix.

To solve this issues, we use a little dirty trick.

### The adventure of "Encoded Types"

We already established, the interface between JS and WASM can handle numbers super easy right out of the gate. And everything we need to know about a variable are just numbers: the **pointer**, the **type**, the **length**.

If we encode all data exchanged between JS and WASM calls into the same format, we gain full flexibility for exchanging data between JS and Zig. Again, due to the length of the article I will just show you an example, of what is possible with a little bit of abstraction to regain full high-level interaction with WASM binaries:

#### JavaScript
```js
// Load a simple helper class
import ZigWASMWrapper from "./helper.js";
// Initialize our wasm module
let wasm = await ZigWASMWrapper.initialize("./main.wasm");
// all exports just get mapped to the wasm object
// and can be called directly.
console.log(wasm.testString());
wasm.printString("Bye World");
```

#### Zig

> **NOTE**: `String` is a struct from our abstraction helpers and not something from zig itself.

```zig
// ...
export fn testString() String {
    return String.init("Bye World");
}

export fn printString(arg: String) void {
    const message = std.fmt.allocPrint(gpa, "String = {s}!", .{arg.value()}) catch @panic("Oops");
    js.log(String.init(message));
}
```

#### Output

```text
Bye World
String = Bye World!
```

## Conlcusion

We learned how to handle numbers and strings between JS and WASM and realized quickly, a lot of boilerplate needs to be put around it to work smootly. Additionally, the flexibility of the JS environment goes out the window due to the low-level interface of WASM, which makes it quite a lot harder to adapt it easily for newcomers.

However, by introducing an abstraction layer for types on both sides, we gain a lot more flexibility and with some more helper code around it, make it behave just like any other JS functions. All the code, that abstracts types fron null, over numbers and floats, to strings and json, can be found in my example repo [oltdaniel/zig-wasm-example](https://github.com/oltdaniel/zig-wasm-example){:target="_blank"}.

> Maybe I write a second part about how I implemented the actual abstraction.