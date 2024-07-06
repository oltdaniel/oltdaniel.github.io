---
layout: post
title: "Counting Instead of Tracking"
date: 2018-11-15
tags: ["analytics", "ruby"]
---

Analyzing the traffic a website receives, is a key part in marketing to
understand and highlight the group of consumers and their interests. However,
the way how it has been implemented in the recent years has evolved from
counting single requests to tracking the use across multiple websites.

For a short moment I decided against this trend and went back to the old
classics of website analysis. I start counting the unique requests, instead of
tracking the user across our website. You may ask yourself now, what the
motivation behind this solution is. First, I hate cookie banners. Every site
we will request, will have an huge cookie banner explaining how our data will
be used on the current site I am viewing. Secondly, I love minimalistic
solutions that will solve our problem in just a view lines of code.

Therefore, I will follow certain rules in our solution in order to deliver a
minimalistic, and privacy protective solution to the user devices with a low
bandwidth usage. How I will receive the visitors data is limited to a simple
resource loading procedure by the browser, which means, I will not use
JavaScript in order to collect and send the data that is required on the server
side. Additionally, our solution is not allowed to store data on the client
device, e.g. cookies, as I do not want to have any kind of cookie banner on our
website.

1. No JavaScript is allowed, the data needs to be sent by the browser itself.
2. As of 1., I am not able to extract any extra information from the client
device and are limited to the HTTP request only.
3. A low bandwidth will be automatically achieved, as I do not need to send
any return body, nor is the server required to send any scripts to the client
that are responsible for the data collection and sending procedure.

### Meta-data

The way of making the request is now done. But I need to decided on the
information I will extract from the HTTP headers or can be extracted from the
raw TCP request behind the HTTP protocol. This can be classified as meta-data.
As I specified in the goal before, I do not want to store that kind of data as
raw data on our server. However, I need some visitor specific data, that I can
use in order to identify a unique user.

Storing an random unique id on the user device as an cookie would have many
advantages at this point, as it will allow us to be completely independent from
the user meta-data and count unique page views as long as the cookie is not
expired. However, I hate cookie banners, so on this kind of solution violates
the rule of our solution.

- **Referer**: The Referer HTTP header will be delivered with the root url
the user requested, of which the received request on our server is a subordinate
request.
- **IP address**: Each request will be started by a visitors device having an
IP address. I will use this, in order to identify the users device with an
unique value.
- **User-Agent**: Multiple browsers are available on the market with
different versions and browser engines. As this setting is not totally unique,
it needs to be combined with another information.

### Storing data

Having specified the data I am able to extract from the HTTP request, I need
to combine this data, in order to be privacy protective and unique. Another
aspect I need to add at this point, is the fact I do not want to store these
informations in raw format on our server.

Lets start with the privacy protective part, that I want in our solution. The
data that is privacy relevant in the meta-data I have collect within the HTTP
request is the IP address. A way of partly anonymizing it is removing the last
part of the IP address, e.g. `1.1.1.1` will become `1.1.1`.[^1] This procedure is also known as IP masking. This
will merge 256 different IP addresses to the same id, but 256 of 2^32 isn't that
much. However doing this will rise the privacy level.

More privacy means less uniqueness in the most cases, if nothing will be stored
on the client device in order to represent an identity. This is a common problem
with using a single value as an identifier. So let us try merging multiple
values together.

Looking back into the list of meta-data I have collected from the HTTP request,
we can use the `User-Agent` header in order to rise the level of uniqueness we
slightly shrank in the last step. By merging the reaming IP address and the
user agent of the specific user, I assigned a specific browser to a specific
client. A partly unique IP address and a partly unique browser user agent give
us way more combinations, and so on, an higher level of uniqueness.

So far, so good. I assigned a unique id to a specific user. However, I need
the root url, in order to identify the page that has been originally requested.
This can be easily done, as a resource request of the browser - in this case for
an image tag - adds a `Referer` HTTP header, which contains the url of the page
that has been originally visited. As I have only a single domain, I can reduce
this url to the path only, instead of the full url. I do not care about the
query a user can choose, as this will allow him to generate an infinite amount
of page views and unique request ids. Each request id belongs to one specific
path and one specific user.

Adding the path to the hash allows the user to be even more anonymous, as the
server can only identify whether he has called the same url twice (matching
request ids) or not. Without the request hash, tracking across the paths is
possible and the privacy shrinks.

The solution to the last step, hiding the actual information behind the unique
data, is hashing it. The id is then only reversible by brute-forcing every
possible input, which would be useless at this point, as the IP address it not
stored in full length in the unique data and who cares about the user agent.

Summarized, our request id will be a hash of a partially IP address, the
user agent and the path that has been originally requested.

### Code

The solution is now defined. A possible implementation can be found below
written in Ruby. Please note, that the provided solution is not production ready
and has no persistent storage. If this kind of concept should be moved to
production, it is suggested to add a database server, taking care of the unique
request ids. However, a cuckoo filter - or other filters - as this will filter
out same requests in order to lower the database server usage.

If this functionality will be abused by other websites, the code will
automatically reject those requests by checking the domain of the `Referer`
header.

```ruby
require 'sinatra'
require 'cuckoo_filter'

require 'uri'
require 'digest'

set :port, 3001

# In order to identify unique requests
filter = CuckooFilter.make(size: 10_000)
# Final statistics
counts = Hash.new(0)

get '/image.jpg' do
  content_type 'image/jpg'
  # Referer must be given
  return if request.referer.nil?
  url = URI(request.referer)
  # Root referer host is required
  return unless url.host == 'fcused.at'
  # Remove last ip address block
  ip = request.ip[0...request.ip.rindex('.')]
  # Convert meta-data into non-meta-data identifier
  hash = Digest::SHA256.hexdigest "#{ip}#{request.user_agent}#{url.path}"
  # Check if request already exists
  unless filter.lookup hash
    # Add request if to filter
    filter.insert hash
    # Increment counts
    counts[url.path] += 1
  end
end

get '/stats' do
  # Return the current statistics
  counts
end
```


In order to count specific requests on some pages, the following HTML need to be
added.

```html
<img src="http://localhost:3001/image.jpg" style="display: none;">
```

This kind of implementation can be applied to any content type. The request
since can be reduced to under 100bytes, meaning there is no time and bandwidth
consumed in web analytics. An example implementation in golang can be found here
[https://github.com/oltdaniel/door](https://github.com/oltdaniel/door).

### Conclusion

As an final statement I can say, that the statistics I collect from the
requests and store in our database, deliver enough information to elaborate
facts I can reuse for marketing purposes. Besides, I can say, due to the low
amount of information, I will have a low bandwidth usage and deliver a
minimalistic solution. The privacy aspect I described in the beginning is
simply covered by the hashing of the user id and removing the last block of the
IP address.

## References

[^1]: [https://support.google.com/analytics/answer/2763052](https://support.google.com/analytics/answer/2763052)