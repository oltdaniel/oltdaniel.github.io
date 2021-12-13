---
date: "2021-12-13"
title: "Cheap and stupid AWS URL shortener"
description: "How cheap and low-tech can we make an URL shortener?"
tags: ["aws"]
---

AWS is known to be not the cheapest option when it comes to cloud services. But the options it will give you, are endless due to its massive product selection.So the challenge is, *how low-tech or stupid and especially how cheap can you make an URL shortener?*

> **NOTE**: There are some drawbacks that we were willing to accept during the impelemntation of this functionality.
> 1. Redirects will only work in browsers.
> 2. No quick changes to registered shortned urls.
> 3. No interface to register new urls.
> 
> Keep this in mind.

## First approach

As I was challenged with this project in the end of 2020, where I was new to AWS, so my first approach was a bit naive. Before I focused on creating custom REST APIs running on their own servers and containers. Therefore, I decided to checkout the massive AWS product page.[^1]

Quickly I relaized, hosting containers or allocating custom a server isn't easy nor cheap. Especially hosting containers has dozens of options, as pointed out by Corey Quinn in his article "The 17 Ways to Run Containers on AWS".[^2] So this is not the way to go.

## Rethinking

Let us just throw everythong over board and start with an empty sheet of paper and focus on the different parts our URL shortener exists of.

> 1. Accepting requests and responding to them.
> 2. A central entity which looks up the requested url for an redirection target.
> 3. Something that will actually redirect the request.

### How to redirect?

We have multiple options for how to redirect a HTTP request. We could either respond with an HTTP `Location` header or serve some HTML which would redirect the browser to the actual URL.

Responding with an custom HTTP header would mean, we need to execute some code every time a request comes in. That isn't stupid or cheap enough. *So how could we include a redirection in the HTML file?*

There are two simple options.

##### Option 1: JavaScript
```html
<html>
    <head>
        <title>Redirecting...</title>
    </head>
    <script>
        window.location.href = 'URL';
    </script>
</html>
```

##### Option 2: Meta Tag
```html
<html>
    <head>
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0; url=URL" />
    </head>
</html>
```

Stupid and cheap being our main goal here, [Option 2](#option-2-meta-tag) is our way to go. We don't require some script executions and the browser needs to parse the HTML elements anyway.

Summarized, we only need to serve the correct HTML file, which is the easiest thing to deploy and manage. The actual services we will use will be introduced later.

### How to map request to target URL?

We have now resolved the question on how to redirect, but we also need to decide on how we map a requested URL to the specific HTML file. The most simple approach we could use is, encoding the whole requested URL into a filename. This will deliver is an 1:1 mapping of requested url to filename.

*Which encoding?* The encoding everybody uses to encode anything on the web into a safe string. **Base64**. This means, we can map our requests like this:

| Requested URL | Filename |
|-|-|
| `example.org/abc123/welt` | `ZXhhbXBsZS5vcmcvYWJjMTIzL3dlbHQK.html` |
| `something.example.org` | `c29tZXRoaW5nLmV4YW1wbGUub3JnCg==.html` |

### Handling traffic

As mentioned in [How to redirect?](#how-to-redirect) we just need to serve the correct HTML file. *But where will the files be stored*, *how do we serve these files* and *where will be map the request to the filename?* So lets dive right into one way, on how to serve static files via AWS.

#### Storing the HTML files

Storing files is very easy to answer even without the AWS Product Page. Amazon S3.[^3] We have a lot of flexibility on how the access is managed and how files will stored/moved and much more.

#### Serving the HTML files

Serving static files is made easy thanks to AWS Cloudfront.[^4] We can quickly setup custom Domains, SSL certificates and serve files out of S3 buckets.

#### Mapping request to filename

The connection between an AWS Cloudfront instance and an S3 buckets consists of 4 different event types.

- **Viewer request**: The request that describes the incoming traffic to cloudfront directly.
- **Viewer response**: The response right before it will be sent to the client.
- **Origin request**: The request behind Cloudfront to its origin, if there is a cache miss.
- **Origin response**: The response of the origin, before it is handled by Cloudfront.

The event interesting to us is the **Origin request** event. At this stage Cloudfront doesn't know what to serve and requires a new mapping of the request to an target filename in our S3 bucket.

## Implementation

![](/posts/cheap-and-stupid-aws-urlshortener/infrastructure.svg)

> **NOTE**: This post intends to show what is possible with AWS Lambda and Cloudfront. If any information is outdated or actions you do based on this post cause any harm (finacially or in any other way) I'm not responsible.

### S3 Bucket

![](/posts/cheap-and-stupid-aws-urlshortener/create_s3_bucket.png)

We don't need to change anything else in the default options of the bucket settings. Just pick a name an region that suits you.

### Lambda@Edge

Our mapping from the request to the specific base64 filename will be done with a Lambda function. To be exact an Lambda@Edge function. This difference is very important, as Cloudfront in the next section, will only allow Lambda@Edge functions due to the deployment region.

For this, change you AWS region to `us-east-1`, the global AWS region. Here you will open Lambda and create a new Lambda function that will accept our cloudfront requests.

![](/posts/cheap-and-stupid-aws-urlshortener/create_lambda_function_1.png)

Now jump into the Lambda editor and use the following code and click Deploy!

```JavaScript
'use strict';

// Some helper functions from StackOverflow
const pointsToFile = uri => /\/[^/]+\.[^/]+$/.test(uri);
const hasTrailingSlash = uri => uri.endsWith('/');
const needsTrailingSlash = uri => !pointsToFile(uri) && !hasTrailingSlash(uri);

exports.handler = (event, context, callback) => {
    // Extract the request from the CloudFront event that is sent to Lambda@Edge 
    let request = event.Records[0].cf.request;

    try {
        // Extract the URI and query string from the request
        const hostname = request.headers.host[0].value;
        let uri = request.uri;

        // Extend trailing slash if not present
        if (needsTrailingSlash(uri)) {
            uri += '/'
        }

        // Base64 encode
        const newUri = Buffer.from(`${hostname}${uri}`).toString('base64');

        // Assign new uri
        request.uri = `/${newUri}.html`;

        // Change host header to origin header, else S3 fails
        request.headers.host = [{"key": "Host", "value": request.origin.s3.domainName}]
    } catch (err) {
        console.error(err)
    }

    // Return to CloudFront
    return callback(null, request);

};
```

With this done, we can prepare our Cloudfront Distribution,

### Cloudfront

#### Cache Policy

As Cloudfront caches as much as it can, we need to tweak the default policy to support the correct handling of subdomains. For that, jump into the side menu and open "Policies" and create a new policy.

Just give it a good name and add the `Host` header to the "Cache key settings".

![](/posts/cheap-and-stupid-aws-urlshortener/create_cloudfront_policy.png)

> **Explanation**: If we don't add the host header to the caching policy, only the main domain will be used for the cache. Which means, if `example.org/hallo` is called first, `sub.example.org/hallo` will be resolved to the same cached content.
>
> *Don't ask, how I learned that...*

#### Distribution

![](/posts/cheap-and-stupid-aws-urlshortener/create_cloudfront_distribution_1.png)

As the origin domain, select the S3 Bcuket you've just created. As we made it a private bucket with strict policies (the default options), we need to allow Cloudfront access to that specific S3 bucket. For that, we can simply choose "Yes use OAI" and use "Create new OAI" to automatically create the required access rights. **Don't forget** to choose "Yes, update the bucket policy", else the policiy exists but hasn't been registered within that bucket.

![](/posts/cheap-and-stupid-aws-urlshortener/create_cloudfront_distribution_2.png)
In order to make caching work correctly, we select our previously created custom Caching Policy. Additionally, we **require** to known the host that is called to resolve the full request url including the full domain. For that we simply use the "AllViewer" policy.

![](/posts/cheap-and-stupid-aws-urlshortener/create_cloudfront_distribution_3.png)
Now the only main thing left for the shortener is, to select our Lambda function we have created before. The "Function ARN/Name" can be found in the Lambda function details and just needs to be copied.

Additionally, I recommend to select "Redirect HTTP to HTTPS" add your own custom CNAME and Custom SSL certificate in combination with Route53.[^5] Moreover, using "Error pages" in the Cloudfront Distibution settings is recommended. Simply redirect `403` and `404` to `/` which will than resolve via the Lambda function to the base64 code of your root domain.

Now you can click **Create distribution**.

## Workflow for new urls

As we didn't require any interface for registering any new urls, we can simply create a new HTML file with a bash script and upload it to the bucket with the AWS cli. In the real world, something like an Slack Bot or similar that uses an Lambda function would a good way to register new URLs with an random id, like `example.org/abc123`.

```bash
#!/usr/bin/env bash

SOURCE=$1
TARGET=$2

HTML="<html>
    <head>
        <meta http-equiv=\"refresh\" content=\"0; url=$TARGET\" />
    </head>
</html>"

HASH=$(echo -ne "$SOURCE" | base64)
FILEPATH="$(dirname $0)/${HASH}.html"

echo "$HTML" > $FILEPATH
aws s3 cp $FILEPATH s3://urlshortener/
```

If you want to replace an existing shortned URL, you also need to invalidate the Cloudfront cache before the change takes effect.[^6]

## Costs

Lets assume some traffic stuff. Every registered URL is requested 10000 times a month and we have 1000 registered URLs. Additionally, we **exclude the free tier** for full price transparency.

> Pricing data from `2021-12-13`.

#### Costs Lambda@Edge

Our Lambda function takes `2ms` to respond if hot. But let us assume the worst case with `100ms` on average. We only require the minimum RAM requirement `128MB`.

Which means using the AWS calculator[^7]: 
> ```1,000 requests x 100 ms x 0.001 ms to sec conversion factor = 100.00 total compute (seconds)
> 0.125 GB x 100.00 seconds = 12.50 total compute (GB-s)
> 12.50 GB-s x 0.00005001 USD = 0.00 USD (monthly compute charges)
> 1,000 requests x 0.0000006 USD = 0.00 USD (monthly request charges)
> Lambda@Edge costs (monthly): 0.0006 USD

#### Costs S3

Our HTML template file without the target URL itself consumes `98bytes`. An Google Drive target URL requires about `103bytes`. So we have `1000 URLs * (98bytes + 103bytes) = 196000 bytes = 196kB`. Additionally we have 1000 PUT, COPY, POST, LIST  requests and 1000 GET, SELECT requests and return the stored storage once thanks to the caching of cloudfront.

Which means using the AWS calculator[^7]:
> ```Tiered price for: 0.000196 GB
> 0.000196 GB x 0.0230000000 USD = 0.00 USD
> Total tier cost = 0.0000 USD (S3 Standard storage cost)
> 1,000 PUT requests for S3 Storage x 0.000005 USD per request = 0.005 USD (S3 Standard PUT requests cost)
> 1,000 GET requests in a month x 0.0000004 USD per request = 0.0004 USD (S3 Standard GET requests cost)
> 0.000196 GB x 0.0007 USD = 0.00 USD (S3 select returned cost)
> 0.0004 USD + 0.005 USD = 0.01 USD (Total S3 Standard Storage, data requests, S3 select cost)
> S3 Standard cost (monthly): 0.01 USD

#### Costs Cloudfront

Assuming we only send traffic to Europe, all saved URls will be called 10000times, which means we serve `195kB * 10000requests = 1.96GB` of data with a total of 10000000 requests.

Which means using the AWS calculator[^7]:
> ```Tiered price for: 1.96 GB
> 1.96 GB x 0.0850000000 USD = 0.17 USD
> Total tier cost = 0.17 USD (Data transfer out to internet from Europe)
> Data transfer out to internet cost: 0.17 USD
> Data transfer out to origin cost: 0 USD
> 10,000,000 requests x 0.0000012 USD = 12.00 USD (HTTPS requests from Europe)
> Requests cost: 12.00 USD
> 0.17 USD + 12.00 USD = 12.17 USD (Total cost Europe)
> CloudFront price Europe (monthly): 12.17 USD

#### Costs summary

Which means, we have a monthly total of `12.18USD` **if we don't use the free tier**. If we do, we pay nothing as Cloudfront has a huge Free tier since `2021-12-01` with 1TB free traffic and 10million free requests. Our S3 usage is so low, it is covered by the free tier anyway and the Lambda@Edge costs are somewhere in the less than 1cent region.

## Summary

*Should you do this?* ... **Definitely not.** Search for an existing service that also includes an fancy web interface and don't waste hours trying to make something fit, it wasn't designed for. But this is a great way of learning how you can combine Lambda@Edge with Cloudfront to create something new.

<!-- Footnotes -->
[^1]: AWS products page: [`https://aws.amazon.com/products`](https://aws.amazon.com/products)
[^2]: "The 17 Ways to Run Containers on AWS" by Corey Quinn at LastWeekInAWS: [`https://www.lastweekinaws.com/blog/the-17-ways-to-run-containers-on-aws`](https://www.lastweekinaws.com/blog/the-17-ways-to-run-containers-on-aws/)
[^3]: Amazon S3 Product Page: [`https://aws.amazon.com/s3`](https://aws.amazon.com/s3)
[^4]: Amazon Cloudfront Product Page: [`https://aws.amazon.com/cloudfront`](https://aws.amazon.com/cloudfront)
[^5]: AWS Documentation "Using custom URLs by adding alternate domain names (CNAMEs)": [`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html`](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
[^6]: AWS Documentation: "Invalidating Files": [`https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html`](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
[^7]: AWS Calculator: [`https://calculator.aws`](https://calculator.aws/)