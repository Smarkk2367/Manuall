"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, CheckCircle2, Box, Loader2 } from "lucide-react";

interface PartData {
  id: number;
  svg: string;
}

interface AssemblyStep {
  stepNumber: number;
  description: string;
  partsInvolved: number[];
}

interface InstructionStepperProps {
  instructionsFile: string;
  partsFile: string;
}

export default function InstructionStepper({ instructionsFile, partsFile }: InstructionStepperProps) {
  const [steps, setSteps] = useState<AssemblyStep[] | null>(null);
  const [parts, setParts] = useState<PartData[] | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [instRes, partsRes] = await Promise.all([
          fetch(`http://localhost:3001/api/step/file/${instructionsFile}`),
          fetch(`http://localhost:3001/api/step/file/${partsFile}`)
        ]);

        if (!instRes.ok || !partsRes.ok) {
          throw new Error("Failed to load instructions or parts metadata");
        }

        const instData = await instRes.json();
        const partsData = await partsRes.json();

        setSteps(instData.steps);
        setParts(partsData.parts);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [instructionsFile, partsFile]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500">Loading assembly instructions...</p>
      </div>
    );
  }

  if (error || !steps || !parts) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-red-600 bg-red-50">
        <p>{error || "Failed to load instructions"}</p>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Assembly Guide</h2>
          <p className="text-sm text-gray-500 mt-1">Step {currentStepIndex + 1} of {steps.length}</p>
        </div>
        <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-blue-100">
          <span className="font-bold text-lg text-blue-600">{currentStepIndex + 1}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
        <div className="text-center mb-10 max-w-sm">
          <p className="text-xl font-medium text-gray-800 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {(currentStep.partsInvolved?.length ?? 0) > 0 && (
          <div className="w-full max-w-sm bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
              <Box className="w-4 h-4 mr-2" />
              Required Parts
            </h4>
            <div className="flex flex-wrap gap-4 justify-center">
              {(currentStep.partsInvolved ?? []).map(partId => {
                const partInfo = parts.find(p => p.id === partId);
                if (!partInfo) return null;

                return (
                  <div key={partId} className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center p-2">
                      <img
                        src={`http://localhost:3001/api/step/file/${partInfo.svg}`}
                        alt={`Part ${partId}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 mt-2">Part #{partId + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className="px-4 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Previous
        </button>

        {isLastStep ? (
          <button
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors flex items-center shadow-sm shadow-green-200"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Finish
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center shadow-sm shadow-blue-200"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
}
