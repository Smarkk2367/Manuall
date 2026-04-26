"use client";

import { useEffect, useState } from "react";
import { Loader2, Box, Info } from "lucide-react";

interface PartData {
  id: number;
  svg: string;
  bounds: {
    xlen: number;
    ylen: number;
    zlen: number;
  };
}

interface PartsMetadata {
  parts: PartData[];
}

export default function PartGallery({ partsFile }: { partsFile: string }) {
  const [data, setData] = useState<PartsMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/step/file/${partsFile}`);
        if (!res.ok) throw new Error("Failed to load parts data");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load parts");
      }
    };
    fetchParts();
  }, [partsFile]);

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
        <span className="text-sm text-gray-500">Loading parts...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
        <Info className="w-4 h-4 mr-2" />
        Found {data.parts.length} parts in this assembly
      </div>

      <div className="grid grid-cols-2 gap-4">
        {data.parts.map((part) => (
          <div key={part.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center group">
            <div className="w-full aspect-square relative mb-3 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
              <img 
                src={`http://localhost:3001/api/step/file/${part.svg}`} 
                alt={`Part ${part.id}`}
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="w-full text-left">
              <p className="font-semibold text-gray-900 text-sm flex items-center">
                <Box className="w-3 h-3 mr-1.5 text-gray-400" />
                Part #{part.id + 1}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {part.bounds.xlen.toFixed(1)} x {part.bounds.ylen.toFixed(1)} x {part.bounds.zlen.toFixed(1)} mm
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
