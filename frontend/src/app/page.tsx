"use client";

import { useState } from "react";
import UploadForm from "@/components/UploadForm";
import ProgressBar from "@/components/ProgressBar";
import ModelViewer from "@/components/ModelViewer";
import PartGallery from "@/components/PartGallery";
import InstructionStepper from "@/components/InstructionStepper";

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<string | null>(null);
  const [partsFile, setPartsFile] = useState<string | null>(null);
  const [instructionsFile, setInstructionsFile] = useState<string | null>(null);

  const handleUploadSuccess = (id: string) => {
    setJobId(id);
  };

  const handleProgressComplete = (filename: string, partsFilename: string, instructionsFilename: string) => {
    setResultFile(filename);
    setPartsFile(partsFilename);
    setInstructionsFile(instructionsFilename);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-6">
      {!resultFile ? (
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">ManuAll</h1>
            <p className="text-gray-500 text-lg">
              Upload your furniture STEP file to generate interactive assembly instructions.
            </p>
          </div>

          {!jobId ? (
            <UploadForm onSuccess={handleUploadSuccess} />
          ) : (
            <ProgressBar jobId={jobId} onComplete={handleProgressComplete} />
          )}
        </div>
      ) : (
        <div className="w-full h-[90vh] flex flex-col md:flex-row gap-6 max-w-[1600px] mx-auto">
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <ModelViewer resultFile={resultFile} />
          </div>

          <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col gap-6">
            {instructionsFile && partsFile && (
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <InstructionStepper instructionsFile={instructionsFile} partsFile={partsFile} />
              </div>
            )}

            {partsFile && (
              <div className="h-[30vh] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-gray-900 text-sm">Parts List</h3>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <PartGallery partsFile={partsFile} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
