---
layout: post
title: "Minimal Golang Docker image"
description: As golang is a compiled programming language, we don't need to store all the unnecessary build environments in our final image. So lets see, if we get rid of everything, what we need to important again to not break anything.
---

As golang is a compiled programming language, we don't need to store all the unnecessary build environments in our final image. So lets see, if we get rid of everything, what we need to important again to not break anything.

In order to solve everything in a single `Dockerfile`, we will use multi-stage builds. [^1] Our first stage will be focused on the actual compiling of our application. In order to cover as many features on our application as possible, I'll create an API that uses timezone information, calls an external service via https and uses the lua shared library.

## Project setup

First we create a new folder and initialize our dependency manager and load some dependencies.

```bash
go mod init github.com/oltdaniel/golang-minimal-docker
# we will use gin as our webserver
go get github.com/gin-gonic/gin
# and a lua binding
go get github.com/aarzilli/golua/lua
```

```golang
package main

import (
	"io"
	"log"
	"net/http"
	"time"

	"github.com/aarzilli/golua/lua"
	"github.com/gin-gonic/gin"
)

func main() {
	s := gin.Default()

	// call another api via https
	// this will require ca-certificates
	// for verifying the ssl certificate
	s.GET("/ip", func(c *gin.Context) {
		resp, err := http.Get("https://api.ipify.org")
		if err != nil {
			log.Fatal(err)
		}

		c.Status(resp.StatusCode)
		io.Copy(c.Writer, resp.Body)
	})

	// convert some stuff within the timezones
	// this will require the timezone data
	s.GET("/time", func(c *gin.Context) {
		wantedTimeLocation, err := time.LoadLocation("Asia/Tokyo")
		if err != nil {
			log.Fatal(err)
		}
		c.String(
			200,
			"server time in japan would be %v",
			time.Now().In(wantedTimeLocation).String())
	})

	// here we create a lua machine
	// register a custom response function
	// and execute the response directly from within the lua machine
	// this will require the use of the lua library
	s.GET("/lua", func(c *gin.Context) {
		lmachine := lua.NewState()
		defer lmachine.Close()

		lmachine.Register("response", func(ls *lua.State) int {
			resp := ls.ToString(1)
			c.String(200, resp)
			return 1
		})

		err := lmachine.DoString("response 'hello world'")
		if err != nil {
			log.Fatal(err)
		}
	})

	s.Run(":3001")
}
```

## First stage

```dockerfile
# use a fully featured golang build environment
FROM golang:latest AS builder
# install project dependencies
RUN apt update && apt install -y liblua5.1
# select a space for our work
WORKDIR /app
# copy dependency files
COPY go.mod .
COPY go.sum .
# install dependencies
RUN go mod download
# copy everything else
COPY . .
# compile our golang project
RUN GOOS=linux go build -a main.go
# expose e.g. a API port
EXPOSE 3001
# start our application if no exec command given
CMD ["/app/main"]
```
At this point, we don't really care about the image size at all. We can utilize all tools we require in our build environment due to the default debian system. The order of the build steps are essential at this point, if you want to reduce the number of total steps that need to be execute during a new build of the image.

1. Install any system wide packages that are required via `apt`.
2. Specify your work environment and install only the project related dependencies.
3. Copy the actual source code of you application.
4. Compile everything.

It is important to note here, that the use of `.dockerignore` will also help to reduce the build steps, as the `COPY . .` step will be executed again, if anything in the project folder changed, that is not marked to be ignored in the `.dockerignore` file.

The image we have here is a total of `1.19GB`.

## Second stage

The second stage can be split into to different approaches, which will both result in changes of our first stage. You need to ask yourself now, whether your project has any direct usage of non-go libraries. An example for this can be the use of the shared lua library for some embedded scripting functionalities. In general, if you don't really known how your libraries work under the hood or just have too many to check them manually, you can simply try to compile them with both approaches and test it. The `scratch` image with not dependencies at all will however be smaller.

### Second stage: For system libraries

Compiling everything into a static library or even into the executable itself can be really difficult and heavily depends on the implementation of dependecy owner. For a better developer experience I would suggest to make use of the `alpine` linux image. It is very minimal, but still comes with a huge selection of packages that can be installed. As the Golang docker image also supports and alpine image, I suggest we use that, as especially the libraries we may require, will be exactly the same between the first and second stage, which reduces the number of bugs we may run into, like different package names.

So lets rebuild the first stage and add the second one. In my example I'll use the `golua`[^2] package which requires the shared library of lua.

```dockerfile
# first stage for our compiling environment
FROM golang:alpine AS builder
# install build tools
RUN apk add --no-cache build-base
# install libraries
RUN apk add --no-cache lua5.1-dev
# select a space for our work
WORKDIR /app
# copy dependency files
COPY go.mod .
COPY go.sum .
# install dependencies
RUN go mod download
# copy everything else
COPY . .
# compile our golang project
RUN GOOS=linux go build -a main.go

# second stage that will actually be published/deployed
FROM alpine
# install timezone and certificate files
RUN apk add --no-cache tzdata ca-certificates
# install libraries
RUN apk add --no-cache lua5.1-dev
# copy our binary
COPY --from=builder /app/main /
# expose e.g. a API port
EXPOSE 3001
# start our application if no exec command given
CMD ["/main"]
```

This results in an `18MB` docker image.

### Second stage: Just the basics

If your project is focused on only in go written depencies and doesn't cause any problems if you strip away everything from the OS itself.

> As an example I use the same project, but removed the lua functionality due to the bindings.

For this, we don't care about the first stage as we did before. It can be as big as you like, as nothing will be deployed later on and we don't need to worry about any system libraries. In order to ensure that we don't run into any issues with out compiled binary, we need to make sure, the go compiler knows that the binary won't have any access to the current libraries later on. For this we can utilize the compiler flags use in the multistage example of the docker documentation. [^1]

- `CGO_ENABLED=0` will tell the go compiler, it doesn't have access to any system libraries. 
- however, the `-installsuffix cgo` argument is **not required anymore** as stated in the original GitHub issue about static linking issues. [^3]

```dockerfile
# use a fully featured golang build environment
FROM golang:latest AS builder
# change directory of project
WORKDIR /app
# copy everything else
COPY . .
# compile our golang project
RUN CGO_ENABLED=0 GOOS=linux go build -o main  .

FROM scratch
# copy ca certificates to verify other ssl certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
# copy timezone information
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
# copy actual compiled binary
COPY --from=builder /app/main /
# expose port
EXPOSE 3001
# start binary
CMD ["/main"]
```

This results in an `11.7MB` docker image. But we got rid of the shared lua library which was a essential function of our project.

However, there are a lot of projects out there, that port shared library projects to a pure golang version. However, finding bindings for a package you want to you, is way easier. Additionally, many projects like simple APIs don't actually require any bindings at all, **especially if you require new versions of certain projects**.

## Result

### full image `1.19GB`

```diff
- extremly large size
- lot of overhead for running this container
+ easy dependency management
+ similar to many developer environments
```

### alpine image `18MB`

```diff
- package names can be different
- more initial work to find all missing dependencies
+ well supported and documented
+ very small image and overhead
```

### scratch image `11.7MB`

```diff
- no usage of complex dependencies
- no system commands (ls, chmod, ...)
+ perfect for small projects
+ runs only what you want
```

## Final word

Again, the choice is up to you. Every option I listed has nearly equal pros and cons and what speaks most to you or to your project can be different. I personally always suggest to take a look at alpine images and maybe your project can be up and running in a much smaller image with just a few lines of changes.

However, even though scratch images look like a nice thing, it breaks things more often than it actually improves it. So I only suggest this type of image, if you really just have a minimal static binary that needs to be honest and doesn't have any complex dependencies into the system libraries.


## References

[^1]: [`docs.docker.com/develop/develop-images/multistage-build`](https://docs.docker.com/develop/develop-images/multistage-build/)
[^2]: [`github.com/aarzilli/golua`](https://github.com/aarzilli/golua)
[^3]: [`github.com/golang/go/issues/9344#issuecomment-69944514`](https://github.com/golang/go/issues/9344#issuecomment-69944514)