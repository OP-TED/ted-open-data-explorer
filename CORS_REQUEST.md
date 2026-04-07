# CORS request for api.ted.europa.eu

**To**: TED API administrators
**From**: OP-TED, ted-open-data-explorer maintainers

## What we need

Add `https://docs.ted.europa.eu` (and `https://data.ted.europa.eu`)
to the allowed origins on `https://api.ted.europa.eu/v3` for both the
actual response and the CORS preflight (`OPTIONS`).

## Affected endpoint

`POST https://api.ted.europa.eu/v3/notices/search`

(and any other v3 endpoints under the same host that browser-based
applications need to reach)

## What we're seeing

```
Access to fetch at 'https://api.ted.europa.eu/v3/notices/search'
from origin 'https://docs.ted.europa.eu' has been blocked by CORS
policy: Response to preflight request doesn't pass access control
check: No 'Access-Control-Allow-Origin' header is present on the
requested resource.
```

The acceptance API (`api.acceptance.ted.europa.eu`) does allow the
request from the same origin — we are using it as a temporary
workaround.

## Contact

<https://github.com/OP-TED/ted-open-data-explorer/issues>
