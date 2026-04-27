import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PipelineNode, type PipelineNodeData } from '../components/PipelineNode';

// ─── Node types ────────────────────────────────────────────────────────────────
const nodeTypes = { pipeline: PipelineNode };

// ─── Raw node definitions ──────────────────────────────────────────────────────
interface RawNode {
  id: string;
  data: Omit<PipelineNodeData, 'isActive' | 'isCompleted'>;
  position: { x: number; y: number };
}

const RAW_NODES: RawNode[] = [
  { id: 'input',    data: { label: 'User Upload',       subtitle: '.csv + .pkl files'       }, position: { x: 350, y: 40   } },
  { id: 'security', data: { label: 'Security Gate',     subtitle: 'ModelScan'               }, position: { x: 350, y: 140  } },
  { id: 'profiling',data: { label: 'Data Profiling',    subtitle: 'Deepchecks'              }, position: { x: 150, y: 260  } },
  { id: 'proxy',    data: { label: 'Proxy Detector',    subtitle: 'Mutual Info'             }, position: { x: 550, y: 260  } },
  { id: 'audit',    data: { label: 'Fairness Audit',    subtitle: 'AIF360'                  }, position: { x: 150, y: 380  } },
  { id: 'slicer',   data: { label: 'Slice Discovery',   subtitle: 'Decision Tree'           }, position: { x: 550, y: 380  } },
  { id: 'shap',     data: { label: 'SHAP Explanations', subtitle: 'Feature Attribution'     }, position: { x: 350, y: 500  } },
  { id: 'aequitas', data: { label: 'Bias Report Card',  subtitle: 'Aequitas'                }, position: { x: 350, y: 600  } },
  { id: 'score',    data: { label: 'Bias Score',        subtitle: '0–100 composite'         }, position: { x: 350, y: 700  } },
  { id: 'quickfix', data: { label: 'Quick Fix',         subtitle: 'Fairlearn'               }, position: { x: 150, y: 820  } },
  { id: 'deepfix',  data: { label: 'Deep Fix',          subtitle: 'AIF360 + RF'             }, position: { x: 550, y: 820  } },
  { id: 'report',   data: { label: 'Compliance Report', subtitle: 'Gemini + ReportLab'      }, position: { x: 350, y: 940  } },
  { id: 'output',   data: { label: 'PDF + Fixed Model', subtitle: 'Download ready', isOutput: true }, position: { x: 350, y: 1040 } },
];

// ─── Raw edge definitions ──────────────────────────────────────────────────────
const RAW_EDGES = [
  { id: 'e1',  source: 'input',    target: 'security',  type: 'smoothstep' },
  { id: 'e2',  source: 'security', target: 'profiling', type: 'smoothstep' },
  { id: 'e3',  source: 'security', target: 'proxy',     type: 'smoothstep' },
  { id: 'e4',  source: 'profiling',target: 'audit',     type: 'smoothstep' },
  { id: 'e5',  source: 'proxy',    target: 'slicer',    type: 'smoothstep' },
  { id: 'e6',  source: 'audit',    target: 'shap',      type: 'smoothstep' },
  { id: 'e7',  source: 'slicer',   target: 'shap',      type: 'smoothstep' },
  { id: 'e8',  source: 'shap',     target: 'aequitas',  type: 'smoothstep' },
  { id: 'e9',  source: 'aequitas', target: 'score',     type: 'smoothstep' },
  { id: 'e10', source: 'score',    target: 'quickfix',  type: 'smoothstep', label: 'Locked model' },
  { id: 'e11', source: 'score',    target: 'deepfix',   type: 'smoothstep', label: 'Own model'    },
  { id: 'e12', source: 'quickfix', target: 'report',    type: 'smoothstep' },
  { id: 'e13', source: 'deepfix',  target: 'report',    type: 'smoothstep' },
  { id: 'e14', source: 'report',   target: 'output',    type: 'smoothstep' },
];

// ─── Node detail content ───────────────────────────────────────────────────────
interface NodeDetail {
  title: string;
  what: string;
  why: string;
  library: string;
  output: string;
}

const NODE_DETAILS: Record<string, NodeDetail> = {
  input: {
    title: 'User Upload',
    what: 'You provide two files: a training dataset (.csv) containing historical decisions, and your trained ML model (.pkl). Both are required to begin the audit.',
    why: 'The dataset reveals what the model learned from. The model reveals how it applies that learning to new cases.',
    library: 'FastAPI multipart upload',
    output: 'upload_id — a session token for this audit run',
  },
  security: {
    title: 'Security Gate — ModelScan',
    what: "Before loading the model into memory, Mugen scans the .pkl file for malicious code. A technique called a 'pickle bomb' can hide executable code inside a model file.",
    why: "Loading an untrusted .pkl file without scanning is equivalent to running an unknown executable. ModelScan checks the file's AST for unsafe operations.",
    library: 'modelscan (open source, Protect AI)',
    output: 'PASSED or FAILED security verdict. Failed = audit blocked.',
  },
  profiling: {
    title: 'Data Profiling — Deepchecks',
    what: 'Scans the dataset for structural issues: missing values, duplicate rows, and critically — representation gaps. If only 8% of records are from one demographic group, the model has very little to learn from about them.',
    why: 'A model trained on imbalanced data will make confident but unreliable decisions for underrepresented groups — even if the bias is not intentional.',
    library: 'Deepchecks',
    output: 'Representation gaps per group, missing value percentages, schema issues',
  },
  proxy: {
    title: 'Proxy Detector — Mutual Information',
    what: 'Checks whether any features in the dataset are acting as stand-ins for the protected attribute. For example: ZIP code often correlates with race. If the model uses ZIP code, it is effectively using race — even if race is not in the dataset.',
    why: "Removing the sensitive column doesn't make a model fair if other features reconstruct it indirectly. This is called 'proxy discrimination' and it's illegal under most fairness laws.",
    library: 'scikit-learn mutual_info_classif',
    output: 'Leakage Score (0–1). Above 0.75 = strong proxy leakage. Top 5 proxy features listed.',
  },
  audit: {
    title: 'Fairness Audit — AIF360',
    what: 'Runs the model against the dataset and measures outcomes separately for the privileged and unprivileged groups. Calculates seven fairness metrics including Disparate Impact (the 80% rule) and Equal Opportunity Difference.',
    why: "IBM's AIF360 provides over 70 established fairness metrics with mathematical proofs. Using a well-cited library means audit results are legally defensible and reproducible.",
    library: 'AI Fairness 360 (IBM, open source)',
    output: 'disparate_impact, equal_opportunity_diff, fnr_gap, fpr_gap, statistical_parity_difference',
  },
  slicer: {
    title: 'Slice Discovery — Decision Tree',
    what: "Automatically finds the specific demographic subgroups where the model performs worst. Instead of just knowing 'women are affected', it finds 'women over 35 in service industry roles are affected at 3× the average rate'.",
    why: 'Group-level fairness metrics can mask harm to specific intersectional subgroups. A model can pass the 80% rule on average while systematically failing a specific subgroup.',
    library: 'scikit-learn DecisionTreeClassifier (shallow, max_depth=3)',
    output: 'Top 3 intersectional risk slices with FNR gap per slice',
  },
  shap: {
    title: 'SHAP Explanations',
    what: "Explains why the model made each individual decision. SHAP assigns a 'contribution score' to every feature for every prediction — like a breakdown receipt showing which features pushed toward approved and which pushed toward denied.",
    why: "Without SHAP, a model is a black box. With SHAP, you can say 'this applicant was denied primarily because of their marital status, which accounts for 34% of the decision weight.'",
    library: 'SHAP — TreeExplainer (fast) or KernelExplainer (fallback)',
    output: 'Global feature importance ranking + per-individual SHAP values for 500 sampled cases',
  },
  aequitas: {
    title: 'Bias Report Card — Aequitas',
    what: 'Generates a structured report showing which demographic groups are disproportionately affected, across which metrics (FPR, FNR, PPR). Designed specifically for policymakers and compliance teams, not just data scientists.',
    why: 'Aequitas was built by the Center for Data Science and Public Policy specifically for high-stakes decision making in hiring, criminal justice, and healthcare.',
    library: 'Aequitas (University of Chicago, open source)',
    output: 'Per-group disparity grid — false positive rate, false negative rate, predicted positive rate by group',
  },
  score: {
    title: 'Composite Bias Score',
    what: 'Combines all fairness metrics into a single 0–100 score using a weighted formula: 30% Disparate Impact gap + 30% Equal Opportunity difference + 25% False Negative Rate gap + 15% Proxy Leakage score.',
    why: 'A single number makes it easy to compare before and after mitigation, communicate risk to non-technical stakeholders, and set a measurable compliance target.',
    library: 'Custom formula (see docs)',
    output: 'Bias Score 0–100 (0 = perfectly fair, 100 = maximally biased) + breakdown by component',
  },
  quickfix: {
    title: 'Quick Fix — Fairlearn',
    what: "Adjusts the model's decision thresholds separately for each demographic group without touching the underlying model weights. The original model is unchanged — Mugen wraps it in a fairness layer that intercepts every prediction.",
    why: "For enterprise or third-party models where retraining is not possible, threshold adjustment is the only viable option. Fairlearn's ThresholdOptimizer is mathematically proven to achieve group fairness under specified constraints.",
    library: 'Fairlearn ThresholdOptimizer (Microsoft, open source)',
    output: 'Wrapped .pkl model with fair thresholds baked in. Original model weights unchanged.',
  },
  deepfix: {
    title: 'Deep Fix — AIF360 + Random Forest',
    what: 'Purifies the training data first by reweighting or resampling to correct historical imbalances, then trains a completely new model from scratch on the cleaned data. The old model is discarded.',
    why: 'When the root cause is poisoned historical data (past human discrimination encoded as labels), no post-processing fix fully removes the bias. You must address the data before training.',
    library: 'AIF360 Reweighing + scikit-learn RandomForestClassifier',
    output: 'New .pkl model inherently trained on balanced data. Includes cleaned dataset.',
  },
  report: {
    title: 'Compliance Report — Gemini',
    what: 'Google Gemini acts as an autonomous compliance officer. It receives the audit metrics (not the raw data) and generates an executive summary mapped to specific legal articles: EU AI Act Article 10, Article 12, Article 14, NYC Local Law 144, and EEOC guidelines.',
    why: 'Compliance teams need documentation they can show to regulators — not a spreadsheet of numbers. Gemini translates mathematical findings into legally-structured narrative.',
    library: 'Google Gemini 2.0 Flash (or AWS Bedrock Claude 3 Haiku as fallback)',
    output: 'JSON: { summary, article_10, article_12, article_14, recourse_explanation }',
  },
  output: {
    title: 'PDF Report + Fixed Model',
    what: 'The final deliverables: a professionally formatted PDF compliance report (with executive summary, metric tables, EU AI Act article mapping, SHAP charts) and the fixed .pkl model file ready to drop into production.',
    why: 'Organisations need two things: a model they can deploy and documentation to show regulators. Mugen produces both in a single audit run.',
    library: 'ReportLab (PDF), cloudpickle (model serialization)',
    output: '.pdf compliance report + .pkl fixed model (either wrapped or retrained)',
  },
};

// ─── Simulation steps ──────────────────────────────────────────────────────────
const SIMULATION_STEPS = [
  { nodeId: 'input',    edgeIds: [],             duration: 800,  label: 'Receiving uploaded files...'                       },
  { nodeId: 'security', edgeIds: ['e1'],          duration: 1200, label: 'Scanning model for security threats...'            },
  { nodeId: 'profiling',edgeIds: ['e2'],          duration: 1000, label: 'Profiling dataset for representation gaps...'      },
  { nodeId: 'proxy',    edgeIds: ['e3'],          duration: 1000, label: 'Detecting proxy leakage in features...'            },
  { nodeId: 'audit',    edgeIds: ['e4'],          duration: 1200, label: 'Running AIF360 fairness metrics...'                },
  { nodeId: 'slicer',   edgeIds: ['e5'],          duration: 1000, label: 'Discovering intersectional risk slices...'         },
  { nodeId: 'shap',     edgeIds: ['e6', 'e7'],    duration: 1400, label: 'Computing SHAP feature explanations...'            },
  { nodeId: 'aequitas', edgeIds: ['e8'],          duration: 1000, label: 'Generating Aequitas bias report card...'           },
  { nodeId: 'score',    edgeIds: ['e9'],          duration: 800,  label: 'Computing composite bias score...'                 },
  { nodeId: 'quickfix', edgeIds: ['e10'],         duration: 1200, label: 'Applying Fairlearn threshold optimization...'      },
  { nodeId: 'report',   edgeIds: ['e12'],         duration: 1200, label: 'Generating Gemini compliance narrative...'         },
  { nodeId: 'output',   edgeIds: ['e14'],         duration: 1000, label: 'Packaging PDF report and fixed model.'             },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
const HowItWorksPage: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating]     = useState(false);
  const [activeNodeId, setActiveNodeId]     = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [activeEdgeIds, setActiveEdgeIds]   = useState<Set<string>>(new Set());
  const [statusLabel, setStatusLabel]       = useState<string>('');
  const [statusVisible, setStatusVisible]   = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close panel on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNodeId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Computed nodes — inject active/completed state
  const nodes = useMemo(
    () =>
      RAW_NODES.map((node) => ({
        ...node,
        type: 'pipeline',
        data: {
          ...node.data,
          isActive:    activeNodeId === node.id,
          isCompleted: completedNodeIds.has(node.id),
        } as PipelineNodeData,
      })),
    [activeNodeId, completedNodeIds]
  );

  // Computed edges — inject animated/style state
  const computedEdges = useMemo(
    () =>
      RAW_EDGES.map((edge) => ({
        ...edge,
        animated: activeEdgeIds.has(edge.id),
        style: {
          stroke:      activeEdgeIds.has(edge.id) ? '#0F172A' : '#CBD5E1',
          strokeWidth: activeEdgeIds.has(edge.id) ? 2 : 1.5,
        },
        labelStyle:   { fontSize: 10, fill: '#94A3B8' },
        labelBgStyle: { fill: '#F8FAFC', fillOpacity: 1 },
      })),
    [activeEdgeIds]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (!isSimulating) setSelectedNodeId(node.id);
    },
    [isSimulating]
  );

  const startSimulation = useCallback(async () => {
    setSelectedNodeId(null);
    setIsSimulating(true);
    setCompletedNodeIds(new Set());
    setActiveEdgeIds(new Set());
    setStatusVisible(true);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    for (const step of SIMULATION_STEPS) {
      setActiveNodeId(step.nodeId);
      setActiveEdgeIds(new Set(step.edgeIds));
      setStatusLabel(step.label);
      await new Promise<void>((resolve) => setTimeout(resolve, step.duration));
      setCompletedNodeIds((prev) => new Set([...prev, step.nodeId]));
    }

    setActiveNodeId(null);
    setActiveEdgeIds(new Set());
    setStatusLabel('Audit complete. Results ready.');
    setIsSimulating(false);

    fadeTimerRef.current = setTimeout(() => setStatusVisible(false), 3000);
  }, []);

  const selectedDetail = selectedNodeId ? NODE_DETAILS[selectedNodeId] : null;
  const selectedRaw    = selectedNodeId ? RAW_NODES.find((n) => n.id === selectedNodeId) : null;

  // Brand colours as CSS literals (mirrors index.css OKLCH tokens)
  const C = {
    brand:        'oklch(0.45 0.12 250)',   // brand-default
    brandHover:   'oklch(0.35 0.12 250)',   // brand-hover
    brandSurface: 'oklch(0.95 0.02 250)',   // brand-surface — very light blue
    success:      'oklch(0.6 0.15 150)',    // success-default — emerald
    ink:          'oklch(0.18 0.015 250)',  // ink
    inkMuted:     'oklch(0.45 0.015 250)', // ink-muted
    inkFaint:     'oklch(0.85 0.01 250)',  // ink-faint
    paper:        'oklch(0.99 0.002 80)',   // paper
    surface:      'oklch(0.97 0.005 80)',   // surface
    canvasDot:    'oklch(0.91 0.01 250)',   // subtly brand-tinted dot grid
  };

  return (
    <div style={{ minHeight: '100vh', background: C.surface }}>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '80px 24px 48px' }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: C.brand, marginBottom: 12,
        }}>
          Pipeline Architecture
        </p>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: C.ink, marginBottom: 16, fontFamily: 'inherit' }}>
          How Mugen Works
        </h1>
        <p style={{ fontSize: '1rem', color: C.inkMuted, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
          A 13-step pipeline that detects, explains, and fixes bias in any ML model.
          Click any node to learn what it does. Hit Simulate to watch data flow through the full audit.
        </p>
      </div>

      {/* ── Diagram card ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div
          style={{
            position: 'relative',
            background: C.paper,
            border: `1px solid ${C.inkFaint}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {/* ReactFlow canvas */}
          <div
            style={{
              height: 580,
              opacity: selectedNodeId ? 0.5 : 1,
              pointerEvents: selectedNodeId ? 'none' : 'auto',
              transition: 'opacity 200ms ease',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={computedEdges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              panOnDrag={true}
              zoomOnScroll={true}
              minZoom={0.4}
              maxZoom={1.5}
              style={{ background: C.surface }}
              proOptions={{ hideAttribution: true }}
            >
              <Background color={C.canvasDot} gap={24} size={1} variant={BackgroundVariant.Dots} />
              <Controls showInteractive={false} style={{ bottom: 16, left: 16 }} />
              <MiniMap
                nodeColor={() => C.inkFaint}
                maskColor="rgba(248,250,252,0.8)"
                style={{ bottom: 16, right: 16, height: 80 }}
              />
            </ReactFlow>
          </div>

          {/* Backdrop — closes panel */}
          <AnimatePresence>
            {selectedNodeId && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                onClick={() => setSelectedNodeId(null)}
              />
            )}
          </AnimatePresence>

          {/* Detail panel — slides from right */}
          <AnimatePresence>
            {selectedDetail && selectedRaw && (
              <motion.div
                key="panel"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '38%',
                  height: '100%',
                  background: C.paper,
                  borderLeft: `1px solid ${C.inkFaint}`,
                  zIndex: 20,
                  overflowY: 'auto',
                  padding: '24px 24px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedNodeId(null)}
                  aria-label="Close panel"
                  style={{
                    alignSelf: 'flex-end',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 20,
                    color: C.inkMuted,
                    lineHeight: 1,
                    padding: '2px 4px',
                  }}
                >
                  ×
                </button>

                {/* Title block */}
                <div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: C.ink, marginBottom: 6 }}>
                    {selectedDetail.title}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      background: C.brandSurface,
                      borderRadius: 4,
                      fontSize: 11,
                      padding: '2px 8px',
                      color: C.brand,
                      fontWeight: 600,
                    }}
                  >
                    {selectedDetail.library}
                  </span>
                </div>

                {/* WHAT */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brand, marginBottom: 8 }}>
                    What it does
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: C.inkMuted }}>
                    {selectedDetail.what}
                  </p>
                </div>

                {/* WHY */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brand, marginBottom: 8 }}>
                    Why it matters
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: C.inkMuted }}>
                    {selectedDetail.why}
                  </p>
                </div>

                {/* OUTPUT */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.brand, marginBottom: 8 }}>
                    Output
                  </p>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      background: C.brandSurface,
                      padding: '10px 12px',
                      borderRadius: 6,
                      color: C.ink,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedDetail.output}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Simulate button ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 24, gap: 12 }}>
          <button
            id="simulate-btn"
            onClick={startSimulation}
            disabled={isSimulating}
            style={{
              background: isSimulating ? C.inkMuted : C.ink,
              color: C.paper,
              borderRadius: 8,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              border: 'none',
              opacity: isSimulating ? 0.65 : 1,
              transition: 'background 200ms ease, opacity 200ms ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { if (!isSimulating) (e.target as HTMLButtonElement).style.background = C.brand; }}
            onMouseLeave={(e) => { if (!isSimulating) (e.target as HTMLButtonElement).style.background = C.ink; }}
          >
            {isSimulating ? 'Simulating...' : '▶  Simulate Live Run →'}
          </button>

          {/* Status label */}
          <AnimatePresence>
            {statusVisible && (
              <motion.p
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: isSimulating ? C.brand : C.inkMuted,
                  fontFamily: 'monospace',
                  minHeight: 20,
                  margin: 0,
                  fontWeight: isSimulating ? 600 : 400,
                }}
              >
                {isSimulating && <span style={{ marginRight: 8, color: C.brand }}>⟳</span>}
                {statusLabel}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Closing strip ────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 80,
          padding: '48px 24px',
          textAlign: 'center',
          borderTop: `1px solid ${C.inkFaint}`,
          background: C.paper,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.brand, marginBottom: 12 }}>
          Get started
        </p>
        <p style={{ fontSize: '1.25rem', fontWeight: 600, color: C.ink, marginBottom: 8 }}>
          Ready to audit your model?
        </p>
        <p style={{ color: C.inkMuted, marginBottom: 24, fontSize: '0.9rem' }}>
          Upload your dataset and model. Results in under 60 seconds.
        </p>
        <Link to="/">
          <button
            style={{
              background: C.ink,
              color: C.paper,
              padding: '12px 32px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'inherit',
              transition: 'background 200ms ease',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = C.brand; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = C.ink; }}
          >
            Start Audit →
          </button>
        </Link>
      </div>
    </div>
  );
};

export default HowItWorksPage;
