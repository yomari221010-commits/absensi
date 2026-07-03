"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, SwitchCamera, AlertCircle } from "lucide-react";
import { GeoLocationData, getCurrentLocation } from "@/lib/geolocation";

interface AttendanceCameraProps {
  absenType: "masuk" | "keluar";
  onClose: () => void;
  onCapture: (photo: string, location: GeoLocationData) => void;
}

export function AttendanceCamera({ absenType, onClose, onCapture }: AttendanceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser tidak mendukung kamera. Gunakan HTTPS atau localhost.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError(
        "Tidak dapat mengakses kamera. Izinkan akses kamera di pengaturan browser/perangkat."
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode, startCamera, stopCamera]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || capturing || cameraError) return;

    setCapturing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Gagal memproses foto");

      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL("image/jpeg", 0.85);

      const location = await getCurrentLocation();
      stopCamera();
      onCapture(photo, location);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Gagal menyimpan absensi");
      setCapturing(false);
    }
  };

  return (
    <div className="size-full flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        {!cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white text-sm leading-relaxed">{cameraError}</p>
            <button
              type="button"
              onClick={() => { setCapturing(false); startCamera(facingMode); }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg,#4338ca,#6d28d9)" }}
            >
              Coba Lagi
            </button>
          </div>
        )}

        {capturing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <p className="text-white text-sm font-medium">Menyimpan absensi...</p>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 pb-4 z-10">
          <button
            type="button"
            onClick={onClose}
            disabled={capturing}
            className="w-11 h-11 flex items-center justify-center rounded-2xl disabled:opacity-50"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="px-4 py-2 rounded-2xl" style={{ background: "rgba(0,0,0,0.55)" }}>
            <p className="text-white text-sm font-bold">
              {absenType === "masuk" ? "Absen Masuk" : "Absen Keluar"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            disabled={capturing || !!cameraError}
            className="w-11 h-11 flex items-center justify-center rounded-2xl disabled:opacity-50"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 pb-12 flex items-center justify-center z-10">
          <button
            type="button"
            onClick={capture}
            disabled={capturing || !!cameraError}
            className="rounded-full flex items-center justify-center active:scale-90 disabled:opacity-50 transition-transform"
            style={{
              width: 72,
              height: 72,
              background: "white",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.3)",
            }}
          >
            <div className="w-14 h-14 rounded-full border-[3px] border-black/10 bg-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
