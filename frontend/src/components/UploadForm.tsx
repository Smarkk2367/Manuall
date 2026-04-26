"use client";

import { useState, useRef } from "react";
import { UploadCloud, File, AlertCircle, Loader2 } from "lucide-react";

interface UploadFormProps {
  onSuccess: (jobId: string) => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.name.toLowerCase().endsWith(".step") && !selectedFile.name.toLowerCase().endsWith(".stp")) {
      setError("Please select a valid STEP file (.step, .stp)");
      return false;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File exceeds 50MB limit");
      return false;
    }
    setFile(selectedFile);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:3001/api/step/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed. Server responded with an error.");
      }

      const data = await response.json();
      if (data.jobId) {
        onSuccess(data.jobId);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-full p-10 border-2 border-dashed rounded-xl transition-colors text-center cursor-pointer flex flex-col items-center justify-center ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".step,.stp"
          className="hidden"
        />
        
        {file ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <File size={32} />
            </div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <p className="font-medium text-gray-900 mb-1">Click or drag file to this area to upload</p>
            <p className="text-sm text-gray-500">Supports .step and .stp files up to 50MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="w-full mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {file && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="mt-6 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Start Processing"
          )}
        </button>
      )}
    </div>
  );
}
