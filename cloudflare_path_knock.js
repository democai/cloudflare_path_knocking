// Path Knocking Worker for Cloudflare
// Automatically manages IPs in Cloudflare IP Lists based on path access patterns

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

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP');
  const path = url.pathname;
  
  // Check path against all configured lists
  const matchedList = checkPath(path);
  
  if (matchedList) {
    console.log(`${matchedList.name} path accessed from IP: ${clientIP} on path: ${path}`);
    
    try {
      // Add the IP to the matched list
      await addIpToList(clientIP, matchedList);
      
      // Log the action
      await logAction(clientIP, path, matchedList);
    } catch (error) {
      console.error(`Error processing IP for ${matchedList.name}: ${error}`);
    }
  }
  
  // Always fetch and return the server's response
  return fetch(request);
}

// Check if the given path matches any of our configured lists
// Returns the matching list configuration or null
function checkPath(path) {
  return LISTS.find(list => isPathInList(path, list.triggerPaths));
}

// Helper function to check if a path is in a path list
function isPathInList(path, pathList) {
  // Check if the path starts with any of our prefix triggers
  const matchesPrefix = pathList.prefixes.some(prefix => 
    path.startsWith(prefix)
  );
  
  // Check if the path exactly matches any of our exact triggers
  const matchesExact = pathList.exact.includes(path);
  
  return matchesPrefix || matchesExact;
}

// Add an IP to the Cloudflare IP List with the specified list configuration
async function addIpToList(ip, listConfig) {
  // Calculate expiration time
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + listConfig.expirationHours);
  
  const data = {
    mode: listConfig.mode,
    configuration: {
      target: "ip",
      value: ip
    },
    notes: listConfig.notes,
    expires_on: expirationTime.toISOString()
  };
  
  // Using Cloudflare's API to add the IP to an IP List
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/rules/lists/${listConfig.listId}/items`, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
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

// Log an action to the console
async function logAction(ip, path, listConfig) {
  const logData = {
    timestamp: new Date().toISOString(),
    action: `${listConfig.name}_ip_${listConfig.mode}`,
    ip: ip,
    path: path,
    list_name: listConfig.name,
    expiration_hours: listConfig.expirationHours
  };
  
  console.log(`${listConfig.name.toUpperCase()}_LOG: ${JSON.stringify(logData)}`);
}
