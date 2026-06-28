import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true },
});

interface MermaidDiagramProps {
  code: string;
}

const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  color: '#6b7280',
  padding: 0,
  transition: 'background 0.15s, color 0.15s',
};

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="5" y="5" width="9" height="9" rx="2" />
      <path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 2v8M5 7l3 3 3-3" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
      <path d="M3 8l4 4 6-6" />
    </svg>
  );
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!containerRef.current) return;
      try {
        await mermaid.parse(code);
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.height = 'auto';
            svgEl.style.maxWidth = '100%';
            svgEl.removeAttribute('width');
          }
        }
      } catch {
        if (!cancelled) setRenderError(true);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (renderError) {
    return (
      <div style={{
        margin: '4px 0',
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
      }}>
        *(Diagram could not be rendered)*
      </div>
    );
  }

  return (
    <div
      style={{ position: 'relative', margin: '12px 0' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action buttons — visible on hover */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 6,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.15s',
        zIndex: 10,
      }}>
        <button
          style={iconBtn}
          onClick={handleCopy}
          title="Copy Mermaid code"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button
          style={iconBtn}
          onClick={handleDownload}
          title="Download as SVG"
        >
          <DownloadIcon />
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          padding: '16px',
          background: '#fafafa',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          overflowX: 'auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
