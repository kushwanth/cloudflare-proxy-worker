addEventListener('fetch', event => {
  event.respondWith(cacheResponse(event))
  event.waitUntil(logging(event))
})

async function cacheResponse(event){
  let request = event.request;
  const cacheURL = new URL(request.url).toString();
  const cacheKey = new Request(cacheURL, request);
  const cache = caches.default;
  let response = await cache.match(cacheKey);
  if (!response) {
      console.log(cacheURL," not present in cache. Fetching and caching request.");
      let originHeaders = new Headers(request.headers);
      originHeaders.delete("cf-connecting-ip");
      originHeaders.delete("cf-ray");
      originHeaders.delete("x-real-ip");
      originHeaders.delete("cf-ipcountry");
      console.log(originHeaders);
      response = await fetch(new Request(cacheURL),{method:"GET", headers: originHeaders});
      response = new Response(response.body, response);
      response.headers.append('Cache-Control', 'private,s-maxage=3600');
      event.waitUntil(cache.put(cacheKey, response.clone()));
    } else {
      console.log("Cache hit for: ",cacheURL);
    }
  return response;
}

async function logging(event) {
    const date = new Date()
    let dt = date.toJSON().split('T')
    let pk = dt[0].replaceAll('-','').slice(2,)
    let rk = dt[1].replace('.','').replaceAll(':','').slice(0,-1)
    let req_url=new URL(event.request.url).pathname
    let metad = {'PartitionKey':pk,'RowKey':rk,'URL': req_url}
    const accountname = await env.get("azureStorageAccount")
    const tablename = await env.get("azureTableName")
    const tableURL = await env.get("azureTableURL")
    let http = getHeaders(event.request)
    let req_loc = getCF(JSON.stringify(event.request.cf))
    let out = JSON.stringify({...metad,...http,...req_loc})
    const sig = await generateSignature(date,tablename,accountname)
    let tableHeaders = new Headers({
    'Content-Type': 'application/json;charset=utf-8',
    'Content-Length': out.length,
    'x-ms-date':date.toUTCString(),
    'x-ms-version':'2021-02-12',
    'Accept':'application/json;odata=nometadata',
    'Authorization': 'SharedKey '+accountname+':'+sig
    });
    let req = new Request(tableURL, {
    method: 'POST',
    headers: tableHeaders,
    body: out,
    });
    return fetch(req)
}

function getCF(req) {
  const cf = JSON.parse(req)
  let req_cf = {'country': cf['country'],'HTTP': cf['httpProtocol'],'TLS':cf['tlsVersion']}
  return req_cf
}

function getHeaders(req) {
  const h = new Map(req.headers)
  if (h.get('referer') == undefined){
    return {'User-Agent': h.get('user-agent'), 'CFray': h.get('cf-ray')}
  }else{
    return {'Ref': h.get('referer'),'User-Agent': h.get('user-agent'), 'CFray': h.get('cf-ray')}
  }
}

function base64ToArrayBuffer(base64) {
  var binary_string = atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateSignature(datetime,tablename,accountname) {
  const encoder = new TextEncoder()
  const azureKey = await env.get('azureTableStorageKey')
  const secretKey = base64ToArrayBuffer(azureKey)
  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  let str_to_sign = 'POST\n\napplication/json;charset=utf-8\n'+datetime.toUTCString()+'\n'+'/'+accountname+'/'+tablename+'()'
  let signaturePromise = await crypto.subtle.sign('HMAC', key, encoder.encode(str_to_sign))
  let signature = btoa(String.fromCharCode(...new Uint8Array(signaturePromise)))
  return signature
}
