import React from 'react';
import { Handle, Position } from 'reactflow';

export interface PipelineNodeData {
  label: string;
  subtitle: string;
  isActive: boolean;
  isCompleted: boolean;
  isOutput?: boolean;
}

export function PipelineNode({ data }: { data: PipelineNodeData }) {
  const border = data.isActive
    ? '1.5px solid rgba(255,255,255,0.70)'
    : data.isCompleted
    ? '1px solid rgba(52,211,153,0.35)'
    : data.isOutput
    ? '1.5px solid rgba(255,255,255,0.22)'
    : '1px solid rgba(255,255,255,0.10)';

  const bg = data.isActive
    ? 'rgba(255,255,255,0.08)'
    : data.isOutput
    ? 'rgba(255,255,255,0.06)'
    : data.isCompleted
    ? 'rgba(52,211,153,0.06)'
    : 'rgba(255,255,255,0.03)';

  const glow = data.isActive
    ? '0 0 0 3px rgba(255,255,255,0.08), 0 4px 20px rgba(255,255,255,0.06)'
    : 'none';

  return (
    <div
      style={{
        width: 160,
        height: 64,
        borderRadius: 10,
        border,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 200ms ease',
        boxShadow: glow,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Completed tick */}
      {data.isCompleted && !data.isActive && (
        <span
          style={{
            position: 'absolute',
            top: 5,
            right: 7,
            fontSize: 9,
            color: 'rgba(52,211,153,0.85)',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ✓
        </span>
      )}

      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: data.isActive
            ? '#ffffff'
            : data.isOutput
            ? 'rgba(255,255,255,0.90)'
            : data.isCompleted
            ? 'rgba(255,255,255,0.55)'
            : 'rgba(255,255,255,0.80)',
          textAlign: 'center',
          lineHeight: 1.3,
          userSelect: 'none',
          letterSpacing: '-0.01em',
        }}
      >
        {data.label}
      </span>

      {/* Subtitle */}
      <span
        style={{
          fontSize: 10,
          marginTop: 2,
          textAlign: 'center',
          userSelect: 'none',
          color: data.isActive
            ? 'rgba(255,255,255,0.45)'
            : 'rgba(255,255,255,0.25)',
          letterSpacing: '0.02em',
        }}
      >
        {data.subtitle}
      </span>

      {/* Handles — invisible */}
      <Handle type="target" position={Position.Top}    style={{ background: 'transparent', border: 'none', width: 0, height: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none', width: 0, height: 0 }} />
    </div>
  );
}
