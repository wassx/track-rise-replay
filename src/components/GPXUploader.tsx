import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  onFile: (file: File) => void;
};

const GPXUploader: React.FC<Props> = ({ onFile }) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,application/gpx+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <Button variant="hero" onClick={() => fileInputRef.current?.click()}>
        Upload GPX
      </Button>
      <span className="text-sm text-muted-foreground">or drag & drop a .gpx file anywhere</span>
    </div>
  );
};

export default GPXUploader;
