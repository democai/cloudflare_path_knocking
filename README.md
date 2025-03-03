# CloudFlare Path Knocking System

A proof-of-concept implementation of "path knocking" for CloudFlare Workers. This system automatically manages IP addresses in CloudFlare IP Lists based on path access patterns. It can be configured to whitelist or block IPs based on their access to specific paths.

## Overview

Similar to "port knocking" in traditional firewalls, this system uses HTTP path access as a trigger mechanism. When a client accesses a predefined URL path, their IP address is automatically added to a configured CloudFlare IP List with a configurable expiration time. The system supports multiple lists, each with their own configuration for paths, expiration times, and actions (whitelist or block).

This can be useful for:
- Creating temporary access to protected resources
- Ensuring legitimate users bypass bot mitigation and rate limiting rules
- Implementing emergency access mechanisms
- Building dynamic IP management systems
- Creating "secret" access paths for authorized users
- Detecting and blocking potential attackers via honeypot paths

## How It Works

1. A client accesses a configured path (e.g., `/prefix/something` or `/auth_check`)
2. The Worker detects this access and captures the client's IP address
3. Based on the matched path configuration, the IP is added to the appropriate CloudFlare IP List with the configured expiration time
4. The original request continues processing normally

## Setup Instructions

### Prerequisites

- CloudFlare account with Workers enabled
- Access to create and manage CloudFlare IP Lists
- API token with appropriate permissions

### Configuration

Edit the configuration objects in the `cloudflare_path_knock.js` file:

```javascript
// Cloudflare API Configuration
const CLOUDFLARE_CONFIG = {
  accountId: 'YOUR_ACCOUNT_ID',
  zoneId: 'YOUR_ZONE_ID',
  apiToken: 'YOUR_API_TOKEN',  // Token needs IP Access Rules edit permission
};

// List Configurations
const LISTS = [
  {
    name: 'whitelist',
    listId: 'YOUR_WHITELIST_ID',
    mode: 'whitelist',
    notes: 'Added via path knocking',
    expirationHours: 24,
    triggerPaths: {
      prefixes: ['/prefix/'],
      exact: ['/auth_check']
    }
  },
  {
    name: 'honeypot',
    listId: 'YOUR_HONEYPOT_LIST_ID',
    mode: 'block',
    notes: 'Added via honeypot detection',
    expirationHours: 168,
    triggerPaths: {
      prefixes: ['/admin/debug/', '/wp-admin/'],
      exact: ['/config.php', '/.env', '/phpinfo.php']
    }
  }
];
```

Each list configuration supports:
- `name`: Identifier for the list
- `listId`: CloudFlare IP List ID
- `mode`: Action to take ('whitelist' or 'block')
- `notes`: Description added to list entries
- `expirationHours`: How long IPs remain in the list
- `triggerPaths`: Paths that trigger IP addition
  - `prefixes`: Array of path prefixes that trigger the list
  - `exact`: Array of exact paths that trigger the list

### Deployment Steps

1. Create a new CloudFlare Worker
2. Copy the contents of `cloudflare_path_knock.js` into the Worker editor
3. Update the configuration values with your actual account information
4. Create the necessary IP Lists in the CloudFlare dashboard
5. Deploy the Worker to your CloudFlare zone
6. Configure the appropriate routes for the Worker in the CloudFlare dashboard

## Security Considerations

This proof-of-concept should be enhanced with additional security measures before production use:

- Consider adding a secret key or token requirement to the trigger paths
- Implement rate limiting to prevent abuse
- Add logging and alerting for suspicious access patterns
- Combine with additional authentication mechanisms for critical systems
- Regularly rotate the paths used for triggering

## Logging

The system logs all actions to the console in JSON format, including:
- Timestamp
- Action type (based on list name and mode)
- IP address
- Triggered path
- List name
- Expiration hours

## Limitations

- The system depends on the CloudFlare API being available
- There may be a slight delay in adding IPs to the Lists
- API rate limits may apply when managing many IPs
- This is a proof-of-concept and should be enhanced for production use

## License

MIT. Do as you please.

## Contributing

I'll accept PRs.
