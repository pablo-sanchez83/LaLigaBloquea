import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

function IndexPopup() {
  const [isCloudflare, setIsCloudflare] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openCloudflareTool = () => {
    chrome.tabs.create({ url: "https://one.one.one.one/" })
  }

  useEffect(() => {
    // Función para verificar si la extensión está disponible
    const isExtensionAvailable = () => {
      try {
        return !!chrome.runtime?.id
      } catch (e) {
        return false
      }
    }

    if (!isExtensionAvailable()) {
      setError("La extensión no está disponible")
      return
    }

    // Obtener el estado de Cloudflare del almacenamiento
    storage.get("isCloudflare")
      .then((value) => {
        console.log("Popup leyó del storage:", value)
        if (value !== undefined) {
          setIsCloudflare(value === "true")
          console.log("Popup estableció isCloudflare a:", value === "true")
        }
      })
      .catch(err => {
        console.error("Error al leer del storage:", err)
        setError("Error al leer los datos")
      })

    // Escuchar mensajes del content script
    const messageListener = (message) => {
      if (message.type === "CLOUDFLARE_DETECTION") {
        console.log("Popup recibió mensaje directo:", message.isCloudflare)
        setIsCloudflare(message.isCloudflare)
      }
    }

    try {
      chrome.runtime.onMessage.addListener(messageListener)
    } catch (err) {
      console.error("Error al configurar el listener de mensajes:", err)
      setError("Error en la comunicación")
    }

    // Limpiar el listener cuando el componente se desmonte
    return () => {
      try {
        chrome.runtime.onMessage.removeListener(messageListener)
      } catch (err) {
        console.error("Error al remover el listener:", err)
      }
    }
  }, [])

  return (
    <div
      style={{
        padding: 16,
        width: 300
      }}>
      <h2>Detector de Cloudflare</h2>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : isCloudflare === null ? (
        <p>Cargando...</p>
      ) : isCloudflare ? (
        <>
          <p style={{ color: "red" }}>❌ ESTA WEB SERÁ BLOQUEADA</p>
          <p>La liga bloquea durante los findes de semana webs hosteadas en Cloudflare en un intento inutil de evitar la piratería destruyendo la experiencia de usuario.</p>
          <p>Si quieres ver la web puedes usar la siguiente herramienta: <button onClick={openCloudflareTool} style={{ 
            background: "none",
            border: "none",
            color: "#0066cc",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            font: "inherit"
          }}>Herramienta oficial de Cloudflare</button></p>
        </>
      ) : (
        <p style={{ color: "green" }}>✅ ESTA WEB NO SERÁ BLOQUEADA</p>
      )}
    </div>
  )
}

export default IndexPopup
