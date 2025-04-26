import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Rangos de IP de Cloudflare
const CLOUDFLARE_IP_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22"
]

// Cache para almacenar resultados
const domainCache = new Map<string, { result: boolean, timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hora

// Función para verificar si una IP está en los rangos de Cloudflare
function isCloudflareIP(ip: string): boolean {
  return CLOUDFLARE_IP_RANGES.some(range => {
    const [rangeIP, bits] = range.split('/')
    const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0)
    const rangeNum = rangeIP.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0)
    const mask = ~((1 << (32 - parseInt(bits))) - 1)
    return (ipNum & mask) === (rangeNum & mask)
  })
}

// Función para verificar si un dominio usa Cloudflare
async function checkCloudflare(domain: string): Promise<boolean> {
  // Verificar caché
  const cached = domainCache.get(domain)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Usando resultado en caché para", domain)
    return cached.result
  }

  try {
    console.log("Verificando Cloudflare para dominio:", domain)
    
    // Verificar nameservers
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=NS`)
    const data = await response.json()
    
    if (data.Answer) {
      const hasCloudflareNS = data.Answer.some((record: any) => 
        record.data.includes('cloudflare.com')
      )
      
      if (hasCloudflareNS) {
        console.log("Dominio usa nameservers de Cloudflare")
        const result = true
        domainCache.set(domain, { result, timestamp: Date.now() })
        return result
      }
    }

    // Verificar IPs
    const ipResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
    const ipData = await ipResponse.json()
    
    if (ipData.Answer) {
      const isCloudflareIP = ipData.Answer.some((record: any) => 
        isCloudflareIP(record.data)
      )
      console.log("Resultado de verificación de IP:", isCloudflareIP)
      const result = isCloudflareIP
      domainCache.set(domain, { result, timestamp: Date.now() })
      return result
    }

    console.log("No se encontró evidencia de Cloudflare")
    const result = false
    domainCache.set(domain, { result, timestamp: Date.now() })
    return result
  } catch (error) {
    console.error('Error checking Cloudflare:', error)
    return false
  }
}

// Escuchar mensajes del content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_CLOUDFLARE") {
    checkCloudflare(request.domain)
      .then(isCloudflare => {
        sendResponse({ isCloudflare })
      })
    return true // Mantener el canal de mensajes abierto para la respuesta asíncrona
  }
}) 