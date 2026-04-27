import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Play, ArrowRight } from 'lucide-react';
import { PipelineNode, type PipelineNodeData } from '../components/PipelineNode';
import QuantumCanvas from '../components/QuantumCanvas';

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
    what: 'Checks whether any features in the dataset are acting as stand-ins for the protected attribute. For example: ZIP code often correlates with race.',
    why: "Removing the sensitive column doesn't make a model fair if other features reconstruct it indirectly. This is called 'proxy discrimination' and it's illegal under most fairness laws.",
    library: 'scikit-learn mutual_info_classif',
    output: 'Leakage Score (0–1). Above 0.75 = strong proxy leakage. Top 5 proxy features listed.',
  },
  audit: {
    title: 'Fairness Audit — AIF360',
    what: 'Runs the model against the dataset and measures outcomes separately for the privileged and unprivileged groups. Calculates seven fairness metrics including Disparate Impact (the 80% rule).',
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
    what: "Explains why the model made each individual decision. SHAP assigns a 'contribution score' to every feature for every prediction — a breakdown receipt showing which features pushed toward approved vs denied.",
    why: "Without SHAP, a model is a black box. With SHAP, you can say 'this applicant was denied primarily because of their marital status, which accounts for 34% of the decision weight.'",
    library: 'SHAP — TreeExplainer (fast) or KernelExplainer (fallback)',
    output: 'Global feature importance ranking + per-individual SHAP values for 500 sampled cases',
  },
  aequitas: {
    title: 'Bias Report Card — Aequitas',
    what: 'Generates a structured report showing which demographic groups are disproportionately affected, across which metrics (FPR, FNR, PPR). Designed for policymakers and compliance teams.',
    why: 'Aequitas was built by the Center for Data Science and Public Policy specifically for high-stakes decision making in hiring, criminal justice, and healthcare.',
    library: 'Aequitas (University of Chicago, open source)',
    output: 'Per-group disparity grid — false positive rate, false negative rate, predicted positive rate by group',
  },
  score: {
    title: 'Composite Bias Score',
    what: 'Combines all fairness metrics into a single 0–100 score: 30% Disparate Impact gap + 30% Equal Opportunity difference + 25% False Negative Rate gap + 15% Proxy Leakage score.',
    why: 'A single number makes it easy to compare before and after mitigation, communicate risk to non-technical stakeholders, and set a measurable compliance target.',
    library: 'Custom formula (see docs)',
    output: 'Bias Score 0–100 (0 = perfectly fair, 100 = maximally biased) + breakdown by component',
  },
  quickfix: {
    title: 'Quick Fix — Fairlearn',
    what: "Adjusts the model's decision thresholds separately for each demographic group without touching the underlying model weights. The original model is unchanged — Mugen wraps it in a fairness layer.",
    why: "For enterprise or third-party models where retraining is not possible, threshold adjustment is the only viable option. Fairlearn's ThresholdOptimizer is mathematically proven to achieve group fairness under specified constraints.",
    library: 'Fairlearn ThresholdOptimizer (Microsoft, open source)',
    output: 'Wrapped .pkl model with fair thresholds baked in. Original model weights unchanged.',
  },
  deepfix: {
    title: 'Deep Fix — AIF360 + Random Forest',
    what: 'Purifies the training data first by reweighting or resampling to correct historical imbalances, then trains a completely new model from scratch on the cleaned data.',
    why: 'When the root cause is poisoned historical data, no post-processing fix fully removes the bias. You must address the data before training.',
    library: 'AIF360 Reweighing + scikit-learn RandomForestClassifier',
    output: 'New .pkl model inherently trained on balanced data. Includes cleaned dataset.',
  },
  report: {
    title: 'Compliance Report — Gemini',
    what: 'Google Gemini acts as an autonomous compliance officer. It receives the audit metrics and generates an executive summary mapped to specific legal articles: EU AI Act Article 10, Article 12, Article 14, NYC Local Law 144, and EEOC guidelines.',
    why: 'Compliance teams need documentation they can show to regulators — not a spreadsheet of numbers. Gemini translates mathematical findings into legally-structured narrative.',
    library: 'Google Gemini 2.0 Flash (or AWS Bedrock Claude 3 Haiku as fallback)',
    output: 'JSON: { summary, article_10, article_12, article_14, recourse_explanation }',
  },
  output: {
    title: 'PDF Report + Fixed Model',
    what: 'The final deliverables: a professionally formatted PDF compliance report and the fixed .pkl model file ready to drop into production.',
    why: 'Organisations need two things: a model they can deploy and documentation to show regulators. Mugen produces both in a single audit run.',
    library: 'ReportLab (PDF), cloudpickle (model serialization)',
    output: '.pdf compliance report + .pkl fixed model (either wrapped or retrained)',
  },
};

const SIMULATION_STEPS = [
  { nodeId: 'input',    edgeIds: [],          duration: 800,  label: 'Receiving uploaded files...' },
  { nodeId: 'security', edgeIds: ['e1'],      duration: 1200, label: 'Scanning model for security threats...' },
  { nodeId: 'profiling',edgeIds: ['e2'],      duration: 1000, label: 'Profiling dataset for representation gaps...' },
  { nodeId: 'proxy',    edgeIds: ['e3'],      duration: 1000, label: 'Detecting proxy leakage in features...' },
  { nodeId: 'audit',    edgeIds: ['e4'],      duration: 1200, label: 'Running AIF360 fairness metrics...' },
  { nodeId: 'slicer',   edgeIds: ['e5'],      duration: 1000, label: 'Discovering intersectional risk slices...' },
  { nodeId: 'shap',     edgeIds: ['e6','e7'], duration: 1400, label: 'Computing SHAP feature explanations...' },
  { nodeId: 'aequitas', edgeIds: ['e8'],      duration: 1000, label: 'Generating Aequitas bias report card...' },
  { nodeId: 'score',    edgeIds: ['e9'],      duration: 800,  label: 'Computing composite bias score...' },
  { nodeId: 'quickfix', edgeIds: ['e10'],     duration: 1200, label: 'Applying Fairlearn threshold optimization...' },
  { nodeId: 'report',   edgeIds: ['e12'],     duration: 1200, label: 'Generating Gemini compliance narrative...' },
  { nodeId: 'output',   edgeIds: ['e14'],     duration: 1000, label: 'Packaging PDF report and fixed model.' },
];

// ─── Framer Motion variants ────────────────────────────────────────────────────
const fade = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

// ─── Main page ─────────────────────────────────────────────────────────────────
const HowItWorksPage: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId]   = useState<string | null>(null);
  const [isSimulating, setIsSimulating]       = useState(false);
  const [activeNodeId, setActiveNodeId]       = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [activeEdgeIds, setActiveEdgeIds]     = useState<Set<string>>(new Set());
  const [statusLabel, setStatusLabel]         = useState('');
  const [statusVisible, setStatusVisible]     = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedNodeId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nodes = useMemo(
    () => RAW_NODES.map(node => ({
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

  const computedEdges = useMemo(
    () => RAW_EDGES.map(edge => ({
      ...edge,
      animated: activeEdgeIds.has(edge.id),
      style: {
        stroke:      activeEdgeIds.has(edge.id) ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)',
        strokeWidth: activeEdgeIds.has(edge.id) ? 2 : 1.2,
      },
      labelStyle:   { fontSize: 9, fill: 'rgba(255,255,255,0.35)' },
      labelBgStyle: { fill: '#0a0a0c', fillOpacity: 1 },
    })),
    [activeEdgeIds]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => { if (!isSimulating) setSelectedNodeId(node.id); },
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
      await new Promise<void>(r => setTimeout(r, step.duration));
      setCompletedNodeIds(prev => new Set([...prev, step.nodeId]));
    }

    setActiveNodeId(null);
    setActiveEdgeIds(new Set());
    setStatusLabel('Audit complete. Results ready.');
    setIsSimulating(false);
    fadeTimerRef.current = setTimeout(() => setStatusVisible(false), 3000);
  }, []);

  const selectedDetail = selectedNodeId ? NODE_DETAILS[selectedNodeId] : null;

  return (
    <div className="relative min-h-screen" style={{ background: '#050507' }}>

      {/* ── Ambient canvas ── */}
      <QuantumCanvas />

      {/* ── Edge vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 90% 60% at 50% 0%, transparent 40%, #050507 100%)' }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div className="relative z-10">

        {/* Hero header */}
        <motion.div
          className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto"
          initial="hidden"
          animate="visible"
        >
          <motion.p
            custom={0} variants={fade}
            className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-500 mb-5"
          >
            Pipeline Architecture
          </motion.p>
          <motion.h1
            custom={1} variants={fade}
            className="font-display font-extrabold text-white tracking-tight leading-none mb-5"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}
          >
            How Mugen Works
          </motion.h1>
          <motion.p
            custom={2} variants={fade}
            className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto"
          >
            A 13-step pipeline that detects, explains, and fixes bias in any ML model.
            Click any node to learn what it does, or hit Simulate to watch data flow through the full audit.
          </motion.p>
        </motion.div>

        {/* Diagram card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto px-6 pb-8"
        >
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              border: '1px solid rgba(255,255,255,0.07)',
              background: '#09090c',
              boxShadow: '0 1px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* ReactFlow canvas */}
            <div
              style={{
                height: 580,
                opacity: selectedNodeId ? 0.35 : 1,
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
                style={{ background: '#09090c' }}
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  color="rgba(255,255,255,0.06)"
                  gap={24}
                  size={1}
                  variant={BackgroundVariant.Dots}
                />
                <Controls
                  showInteractive={false}
                  style={{ bottom: 16, left: 16 }}
                />
              </ReactFlow>
            </div>

            {/* Backdrop */}
            <AnimatePresence>
              {selectedNodeId && (
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 cursor-pointer z-10"
                  onClick={() => setSelectedNodeId(null)}
                />
              )}
            </AnimatePresence>

            {/* Detail panel */}
            <AnimatePresence>
              {selectedDetail && (
                <motion.div
                  key="panel"
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className="absolute top-0 right-0 w-[38%] h-full z-20 overflow-y-auto flex flex-col gap-5 p-6"
                  style={{
                    background: 'rgba(12,12,16,0.97)',
                    borderLeft: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {/* Close */}
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    aria-label="Close panel"
                    className="self-end flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  {/* Title */}
                  <div>
                    <p className="text-white font-bold text-base leading-snug mb-2">
                      {selectedDetail.title}
                    </p>
                    <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-400 tracking-wide">
                      {selectedDetail.library}
                    </span>
                  </div>

                  {/* What */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-2.5">
                      What it does
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {selectedDetail.what}
                    </p>
                  </div>

                  {/* Why */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-2.5">
                      Why it matters
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {selectedDetail.why}
                    </p>
                  </div>

                  {/* Output */}
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-600 mb-2.5">
                      Output
                    </p>
                    <div
                      className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 font-mono text-xs text-slate-300 leading-relaxed"
                    >
                      {selectedDetail.output}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Simulate button row */}
          <div className="flex flex-col items-center mt-6 gap-3">
            <button
              id="simulate-btn"
              onClick={startSimulation}
              disabled={isSimulating}
              className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg text-sm font-bold transition-all duration-200
                ${isSimulating
                  ? 'bg-white/[0.06] text-slate-500 cursor-not-allowed border border-white/[0.06]'
                  : 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] cursor-pointer border border-transparent'
                }`}
            >
              <Play className={`h-4 w-4 shrink-0 ${isSimulating ? '' : 'group-hover:scale-110'}`} />
              {isSimulating ? 'Simulating…' : 'Simulate Live Run'}
            </button>

            <AnimatePresence>
              {statusVisible && (
                <motion.p
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className={`font-mono text-xs text-center min-h-[18px] ${
                    isSimulating ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {isSimulating && <span className="mr-1.5 inline-block animate-spin">⟳</span>}
                  {statusLabel}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Closing strip ── */}
        <div className="mt-20 border-t border-white/[0.06] py-16 px-6 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-600 mb-4">
            Get started
          </p>
          <p
            className="font-display font-bold text-white leading-tight mb-3"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}
          >
            Ready to audit your model?
          </p>
          <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Upload your dataset and model. Results in under 60 seconds.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-sm font-bold text-black bg-white hover:bg-white/90 hover:scale-[1.02] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Start Audit
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default HowItWorksPage;
