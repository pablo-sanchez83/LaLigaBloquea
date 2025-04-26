import { Storage } from "@plasmohq/storage"

const storage = new Storage()

// Función para verificar si la extensión está disponible
function isExtensionAvailable() {
  try {
    return !!chrome.runtime?.id
  } catch (e) {
    return false
  }
}

// Función para verificar si ya tenemos un resultado en el storage
async function checkExistingResult(domain: string): Promise<boolean | null> {
  try {
    const storedDomain = await storage.get("lastCheckedDomain")
    if (storedDomain === domain) {
      const result = await storage.get("isCloudflare")
      return result === "true"
    }
    return null
  } catch (err) {
    console.error("Error al verificar resultado existente:", err)
    return null
  }
}

// Función principal que se ejecuta cuando se carga la página
const main = async () => {
  if (!isExtensionAvailable()) {
    console.log("La extensión no está disponible")
    return
  }

  const domain = window.location.hostname
  
  // Verificar si ya tenemos un resultado para este dominio
  const existingResult = await checkExistingResult(domain)
  if (existingResult !== null) {
    console.log("Usando resultado existente para", domain)
    try {
      chrome.runtime.sendMessage({
        type: "CLOUDFLARE_DETECTION",
        isCloudflare: existingResult
      })
    } catch (err) {
      console.error("Error al enviar mensaje al popup:", err)
    }
    return
  }

  try {
    // Enviar mensaje al background script para verificar Cloudflare
    chrome.runtime.sendMessage(
      { type: "CHECK_CLOUDFLARE", domain },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error al enviar mensaje:", chrome.runtime.lastError)
          return
        }

        if (response) {
          const isCloudflare = response.isCloudflare
          console.log("Content script recibió respuesta:", isCloudflare)
          
          // Almacenar el resultado y el dominio
          Promise.all([
            storage.set("isCloudflare", isCloudflare.toString()),
            storage.set("lastCheckedDomain", domain)
          ]).catch(err => console.error("Error al almacenar:", err))
          
          // Enviar mensaje al popup si está abierto
          try {
            chrome.runtime.sendMessage({
              type: "CLOUDFLARE_DETECTION",
              isCloudflare
            })
          } catch (err) {
            console.error("Error al enviar mensaje al popup:", err)
          }
        }
      }
    )
  } catch (err) {
    console.error("Error en la comunicación con la extensión:", err)
  }
}

// Ejecutar la detección cuando se carga la página
main() 