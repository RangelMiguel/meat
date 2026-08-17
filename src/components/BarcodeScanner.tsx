import { useEffect, useRef, useState } from 'react'
import { Camera, Keyboard, X } from 'lucide-react'
import { t, type Locale } from '../i18n'

type Detected = { rawValue: string }

type DetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: ImageBitmapSource) => Promise<Detected[]>
}

interface Props {
  locale: Locale
  onDetect: (barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ locale, onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t(locale, 'barcodeNoCamera'))
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        setCameraOn(true)

        const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
        if (!Detector) {
          setError(t(locale, 'barcodeTypeInstead'))
          return
        }
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        })
        const tick = async () => {
          const el = videoRef.current
          if (cancelled || !el || el.readyState < 2) {
            timer = window.setTimeout(() => void tick(), 240)
            return
          }
          try {
            const codes = await detector.detect(el)
            const value = codes[0]?.rawValue?.replace(/\s/g, '')
            if (value) {
              onDetect(value)
              return
            }
          } catch {
            /* keep scanning */
          }
          timer = window.setTimeout(() => void tick(), 240)
        }
        void tick()
      } catch {
        if (!cancelled) setError(t(locale, 'barcodeNoCamera'))
      }
    }

    void start()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [locale, onDetect])

  const submitManual = () => {
    const code = manual.replace(/\s/g, '')
    if (code.length >= 6) onDetect(code)
  }

  return (
    <div className="barcode-overlay" role="dialog" aria-modal="true" aria-label={t(locale, 'scanBarcode')}>
      <div className="barcode-sheet">
        <div className="card-header">
          <div>
            <h4>{t(locale, 'scanBarcode')}</h4>
            <p className="sub">{t(locale, 'scanBarcodeSub')}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t(locale, 'cancel')}>
            <X size={16} />
          </button>
        </div>
        <div className={`barcode-video-wrap${cameraOn ? ' is-live' : ''}`}>
          <video ref={videoRef} playsInline muted autoPlay />
          <div className="barcode-reticle" />
        </div>
        {error && <p className="field-hint">{error}</p>}
        <div className="field">
          <label htmlFor="barcode-manual">{t(locale, 'barcodeManual')}</label>
          <div className="barcode-manual-row">
            <input
              id="barcode-manual"
              inputMode="numeric"
              autoComplete="off"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="7501234567890"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitManual()
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={submitManual} disabled={manual.replace(/\s/g, '').length < 6}>
              <Keyboard size={16} /> {t(locale, 'lookupBarcode')}
            </button>
          </div>
        </div>
        {!cameraOn && (
          <p className="field-hint">
            <Camera size={14} /> {t(locale, 'barcodeNoCamera')}
          </p>
        )}
      </div>
    </div>
  )
}
