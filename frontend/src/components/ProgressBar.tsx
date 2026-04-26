"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Box, Loader2 } from "lucide-react";

interface ProgressBarProps {
  jobId: string;
  onComplete: (resultFile: string, partsFile: string, instructionsFile: string) => void;
}

export default function ProgressBar({ jobId, onComplete }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("init");
  const [message, setMessage] = useState("Connecting to server...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:3001/api/progress/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data.percentage);
        setStage(data.stage);
        setMessage(data.message);

        if (data.stage === "error") {
          setError(data.error || "Unknown error occurred");
          eventSource.close();
        }

        if (data.stage === "done" && data.percentage === 100) {
          eventSource.close();
          setTimeout(() => {
            onComplete(data.data.resultFile, data.data.partsFile, data.data.instructionsFile);
          }, 1000);
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center">
          {stage === 'done' ? (
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          ) : error ? (
            <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
          ) : (
            <Loader2 className="w-4 h-4 mr-2 text-blue-500 animate-spin" />
          )}
          {stage}
        </span>
        <span className="text-sm font-bold text-gray-900">{progress}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden relative">
        <div
          className={`h-3 rounded-full transition-all duration-300 ease-out ${error ? "bg-red-500" : stage === 'done' ? "bg-green-500" : "bg-blue-600"
            }`}
          style={{ width: `${progress}%` }}
        />
        {!error && stage !== 'done' && (
          <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden rounded-full">
            <div className="w-full h-full bg-white opacity-20 transform -skew-x-12 animate-pulse translate-x-full" />
          </div>
        )}
      </div>

      <div className="flex items-start">
        <Box className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start border border-red-100">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold mb-1">Processing Error</span>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
