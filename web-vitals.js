addEventListener('fetch', event => {
    try {
      const request = event.request;
      if (request.method.toUpperCase() === 'POST') {
          event.respondWith(WebVitals(event));
    }
      else {return event.respondWith(fetch(request));}
    } catch (e) {
      return event.respondWith(fetch(request));
    }
  });

async function WebVitals(event) {
    let data = await event.request.json();
    let cf = event.request.cf;
    const date = new Date()
    let dt = date.toJSON().split('T')
    let pk = dt[0].replaceAll('-','').slice(2,)
    let rk = dt[1].replace('.','').replaceAll(':','').slice(0,-1)
    let req_url=new URL(data.name).pathname
    let metad = {'PartitionKey':pk,'RowKey':rk,'URL': req_url, 'entry': data.entryType, 'type':data.type}
    let req_loc = getCF(JSON.stringify(cf))
    let calcs = calculateTime(data)
    let out = JSON.stringify({...metad,...req_loc,...calcs})
    const sig = await generateSignature(date)
    let tableHeaders = new Headers({
    'Content-Type': 'application/json;charset=utf-8',
    'Content-Length': out.length,
    'x-ms-date':date.toUTCString(),
    'x-ms-version':'2021-02-12',
    'Accept':'application/json;odata=nometadata',
    'Authorization': 'SharedKey storage_account: '+sig
    });
    let req = new Request("URL", {
    method: 'POST',
    headers: tableHeaders,
    body: out,
    });
    //console.log(req)
    try{
        res = fetch(req);
        return new Response("Success")
    } catch (e){
        return new Response("Error")
    }
}

function calculateTime(times){
    let time = {}
    time["dns"] = +(times.domainLookupEnd - times.domainLookupStart).toFixed(3)
    time["tcp"] = +(times.connectEnd - times.connectStart).toFixed(3)
    time["ssl"] = +(times.connectEnd - times.secureConnectionStart).toFixed(3)
    time["redirect"] = +(times.redirectEnd - times.redirectStart).toFixed(3)
    time["ttfb"] = +(times.responseStart - times.requestStart).toFixed(3)
    time["res"] = +(times.responseEnd - times.responseStart).toFixed(3)
    time["respeed"] = +(times.transferSize/time["res"]).toFixed(3)
    time["load"] = +(times.loadEventEnd - times.responseEnd).toFixed(3)
    time["network"] = +(times.responseEnd - times.fetchStart).toFixed(3)
    time["domdl"] = +(times.domContentLoadedEventEnd - times.domContentLoadedEventStart).toFixed(3)
    time["domready"] = +(times.domComplete - times.domContentLoadedEventStart).toFixed(3)
    time["domint"] = +(times.domContentLoadedEventEnd - times.domInteractive).toFixed(3)
    return time
}


function getCF(request) {
  const cf = JSON.parse(request)
  let req_cf = {'country': cf['country'],'edge': cf['colo']}
  return req_cf
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

async function generateSignature(datetime,env) {
  const encoder = new TextEncoder()
  const azureKey = await proxy.get('azureKey')
  const secretKey = base64ToArrayBuffer(azureKey)
  const key = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  let str_to_sign = 'POST\n\napplication/json;charset=utf-8\n'+datetime.toUTCString()+'\n'+'/storage_account/table_name()'
  let signaturePromise = await crypto.subtle.sign('HMAC', key, encoder.encode(str_to_sign))
  let signature = btoa(String.fromCharCode(...new Uint8Array(signaturePromise)))
  return signature
}
