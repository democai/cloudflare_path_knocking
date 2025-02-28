# CloudFlare Path Knocking System

A proof-of-concept implementation of "path knocking" for CloudFlare Workers. This system automatically adds client IPs to a CloudFlare Allow List when they access specific configured paths.

## Overview

Similar to "port knocking" in traditional firewalls, this system uses HTTP path access as a trigger mechanism. When a client accesses a predefined URL path, their IP address is automatically added to a CloudFlare IP Access List with a configurable expiration time.

This can be useful for:
- Creating temporary access to protected resources
- Implementing emergency access mechanisms
- Building dynamic IP whitelisting systems
- Creating "secret" access paths for authorized users

## How It Works

1. A client accesses a configured "knock path" (e.g., `/prefix/something` or `/auth_check`)
2. The Worker detects this access and captures the client's IP address
3. The IP is automatically added to a CloudFlare IP Access List with a configurable expiration time
4. The original request continues processing normally

## Setup Instructions

### Prerequisites

- CloudFlare account with Workers enabled
- Access to create and manage CloudFlare IP Access Lists
- API token with appropriate permissions

### Configuration

Edit the `CONFIG` object in the `cloudflare_path_knock.js` file:

```javascript
const CONFIG = {
  // Paths that trigger IP whitelisting
  triggerPaths: {
    prefixes: ['/prefix/'],    // Any path starting with these will trigger
    exact: ['/auth_check']  // These exact paths will trigger
  },
  // CloudFlare API settings
  cloudflare: {
    accountId: 'YOUR_ACCOUNT_ID',
    zoneId: 'YOUR_ZONE_ID',
    apiToken: 'YOUR_API_TOKEN',  // Token needs IP Access Rules edit permission
    listId: 'YOUR_IP_LIST_ID'    // ID of the IP Access List to modify
  },
  // Settings for the IP whitelisting
  whitelisting: {
    expirationHours: 24,  // How long IPs stay on the whitelist (in hours)
    notes: 'Added via path knocking',  // Note added to the whitelist entry
    logToSplunk: false,  // Whether to log whitelisting actions to Splunk
  }
};
```

### Deployment Steps

1. Create a new CloudFlare Worker
2. Copy the contents of `cloudflare_path_knock.js` into the Worker editor
3. Update the configuration values with your actual account information
4. Create an IP Access List in the CloudFlare dashboard (or use an existing one)
5. Deploy the Worker to your CloudFlare zone
6. Configure the appropriate routes for the Worker in the CloudFlare dashboard

## Security Considerations

This proof-of-concept should be enhanced with additional security measures before production use:

- Consider adding a secret key or token requirement to the knock paths
- Implement rate limiting to prevent abuse
- Add logging and alerting for suspicious access patterns
- Combine with additional authentication mechanisms for critical systems
- Regularly rotate the paths used for knocking

## Customization Options

The system can be customized in several ways:

- Modify the trigger paths to match your specific needs
- Adjust the expiration time for whitelisted IPs
- Enhance the logging functionality
- Add additional verification steps before whitelisting

## Logging

The system can log whitelisting actions, which is useful for auditing and monitoring. 
Enable or disable this feature with the `logToSplunk` configuration option.

## Limitations

- The system depends on the CloudFlare API being available
- There may be a slight delay in adding IPs to the Allow List
- API rate limits may apply when managing many IPs
- This is a proof-of-concept and should be enhanced for production use

## License

MIT.  Do as you please.

## Contributing

I'll accept PRs.
