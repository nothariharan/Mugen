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
  return (
    <div
      style={{
        width: 160,
        height: 64,
        borderRadius: 10,
        border: data.isActive
          ? '2px solid #0F172A'
          : data.isCompleted
          ? '1px solid #CBD5E1'
          : '1.5px solid #E2E8F0',
        background: data.isActive
          ? '#0F172A'
          : data.isOutput
          ? '#0F172A'
          : '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 200ms ease',
        boxShadow: data.isActive ? '0 0 0 4px oklch(0.95 0.02 250)' : 'none',
      }}
    >
      {/* Completed checkmark — success green */}
      {data.isCompleted && !data.isActive && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            right: 6,
            fontSize: 10,
            color: 'oklch(0.6 0.15 150)',
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      )}

      {/* Title */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: data.isActive || data.isOutput ? '#FFFFFF' : '#0F172A',
          opacity: data.isCompleted && !data.isActive ? 0.6 : 1,
          textAlign: 'center',
          lineHeight: 1.3,
          userSelect: 'none',
        }}
      >
        {data.label}
      </span>

      {/* Subtitle */}
      <span
        style={{
          fontSize: 11,
          color:
            data.isActive || data.isOutput
              ? 'rgba(255,255,255,0.65)'
              : '#94A3B8',
          marginTop: 2,
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        {data.subtitle}
      </span>

      {/* ReactFlow connection handles — hidden visually */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'transparent', border: 'none', width: 0, height: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'transparent', border: 'none', width: 0, height: 0 }}
      />
    </div>
  );
}
