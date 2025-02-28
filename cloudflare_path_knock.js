// Path Knocking Worker for Cloudflare
// Automatically adds IPs to an Allow List when they hit specific paths

// Configuration
const CONFIG = {
  // Paths that trigger IP whitelisting
  triggerPaths: {
    prefixes: ['/prefix/'],    // Any path starting with these will trigger
    exact: ['/auth_check']  // These exact paths will trigger
  },
  // Cloudflare API settings
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
    logToSplunk: true,  // Whether to log whitelisting actions to Splunk
  }
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP');
  
  // Check if the request path matches our trigger paths
  const isPathKnock = isKnockPath(url.pathname);
  
  if (isPathKnock) {
    console.log(`Path knock detected from IP: ${clientIP} on path: ${url.pathname}`);
    
    try {
      // Add the IP to our allow list
      await addIpToAllowList(clientIP);
      
      // Log the successful whitelisting if configured
      if (CONFIG.whitelisting.logToSplunk) {
        await logWhitelistAction(clientIP, url.pathname);
      }
      
      // Continue with the original request and return its response
      // This ensures normal functionality while adding the IP to the allow list
      return fetch(request);
    } catch (error) {
      console.error(`Error whitelisting IP: ${error}`);
      // Still process the original request even if whitelisting fails
      return fetch(request);
    }
  }
  
  // For non-knock paths, just pass through the request
  return fetch(request);
}

// Check if the given path should trigger the knock mechanism
function isKnockPath(path) {
  // Check if the path starts with any of our prefix triggers
  const matchesPrefix = CONFIG.triggerPaths.prefixes.some(prefix => 
    path.startsWith(prefix)
  );
  
  // Check if the path exactly matches any of our exact triggers
  const matchesExact = CONFIG.triggerPaths.exact.includes(path);
  
  return matchesPrefix || matchesExact;
}

// Add an IP to the Cloudflare IP Allow List
async function addIpToAllowList(ip) {
  // Calculate expiration time
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + CONFIG.whitelisting.expirationHours);
  
  const data = {
    mode: "whitelist",
    configuration: {
      target: "ip",
      value: ip
    },
    notes: CONFIG.whitelisting.notes,
    expires_on: expirationTime.toISOString()
  };
  
  // Using Cloudflare's API to add the IP to an IP List
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CONFIG.cloudflare.accountId}/rules/lists/${CONFIG.cloudflare.listId}/items`, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.cloudflare.apiToken}`
      },
      body: JSON.stringify([data])
    }
  );
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(result.errors)}`);
  }
  
  return result;
}

// Log the whitelist action to a logging system
async function logWhitelistAction(ip, path) {
  const logData = {
    timestamp: new Date().toISOString(),
    action: "whitelist_ip",
    ip: ip,
    trigger_path: path,
    expiration_hours: CONFIG.whitelisting.expirationHours
  };
  
  console.log(`WHITELIST_LOG: ${JSON.stringify(logData)}`);
  
}

