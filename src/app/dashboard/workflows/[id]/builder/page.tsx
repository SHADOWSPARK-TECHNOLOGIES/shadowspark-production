'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePageView } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Badge from '@/components/dashboard/Badge';

type WorkflowNodeType = 'trigger' | 'action' | 'condition' | 'end';

type WorkflowNodeData = {
  label: string;
  description?: string;
  config?: Record<string, string>;
};

const NODE_STYLES: Record<WorkflowNodeType, string> = {
  trigger: 'border-sky-500/70 bg-sky-500/10 text-sky-100',
  action: 'border-amber-500/70 bg-amber-500/10 text-amber-100',
  condition: 'border-violet-500/70 bg-violet-500/10 text-violet-100',
  end: 'border-zinc-600 bg-zinc-800/80 text-zinc-100',
};

function WorkflowNode({ data, type }: { data: WorkflowNodeData; type: WorkflowNodeType }) {
  return (
    <div className={`min-w-44 rounded-xl border px-4 py-3 shadow-lg ${NODE_STYLES[type]}`}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-100" />
      <div className="text-xs uppercase tracking-[0.08em] opacity-70">{type}</div>
      <div className="mt-1 text-sm font-semibold">{data.label}</div>
      {data.description ? <div className="mt-1 text-xs opacity-80">{data.description}</div> : null}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-100" />
    </div>
  );
}

const nodeTypes = {
  trigger: (props: { data: WorkflowNodeData }) => <WorkflowNode {...props} type="trigger" />,
  action: (props: { data: WorkflowNodeData }) => <WorkflowNode {...props} type="action" />,
  condition: (props: { data: WorkflowNodeData }) => <WorkflowNode {...props} type="condition" />,
  end: (props: { data: WorkflowNodeData }) => <WorkflowNode {...props} type="end" />,
};

const DEMO_NODES: Node<WorkflowNodeData>[] = [
  { id: '1', type: 'trigger', position: { x: 60, y: 80 }, data: { label: 'Loan Submitted', description: 'Incoming application' } },
  { id: '2', type: 'action', position: { x: 320, y: 80 }, data: { label: 'Send Welcome SMS', description: 'Notify applicant' } },
  { id: '3', type: 'condition', position: { x: 580, y: 80 }, data: { label: 'KYC Approved?', description: 'Branch on review status' } },
  { id: '4', type: 'end', position: { x: 840, y: 80 }, data: { label: 'Move to Disbursement', description: 'Trigger next stage' } },
];

const DEMO_EDGES: Edge[] = [
  { id: '1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: '2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: '3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
];

const PALETTE: { type: WorkflowNodeType; label: string; description: string }[] = [
  { type: 'trigger', label: 'Trigger', description: 'Starts the workflow' },
  { type: 'action', label: 'Action', description: 'Performs a task' },
  { type: 'condition', label: 'Condition', description: 'Branches logic' },
  { type: 'end', label: 'End', description: 'Stops the flow' },
];

function BuilderCanvas({ workflowId }: { workflowId: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEMO_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('2');
  const [workflowName, setWorkflowName] = useState(`Workflow ${workflowId}`);
  const [status, setStatus] = useState<'draft' | 'active' | 'paused'>('draft');

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  function onConnect(connection: Connection) {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        current,
      ),
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_1fr_320px]">
      <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Palette</h3>
          <p className="text-xs text-zinc-500">Drag nodes onto the canvas</p>
        </div>
        <div className="space-y-3">
          {PALETTE.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('application/reactflow', item.type)}
              className={`cursor-grab rounded-xl border p-3 ${NODE_STYLES[item.type]}`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="text-xs opacity-80">{item.description}</div>
            </div>
          ))}
        </div>
      </aside>

      <div
        className="min-h-[640px] overflow-hidden rounded-2xl border border-zinc-800 bg-slate-950"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
          if (!type) return;
          const id = crypto.randomUUID();
          const bounds = event.currentTarget.getBoundingClientRect();
          setNodes((current) => [
            ...current,
            {
              id,
              type,
              position: {
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              },
              data: {
                label: `${type[0].toUpperCase()}${type.slice(1)} node`,
                description: 'New step',
              },
            },
          ]);
          setSelectedNodeId(id);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          fitView
          className="bg-slate-950"
        >
          <Background gap={24} size={1} color="rgba(148,163,184,0.12)" />
          <MiniMap pannable zoomable className="!bg-zinc-950" />
          <Controls />
        </ReactFlow>
      </div>

      <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Properties</h3>
          <p className="text-xs text-zinc-500">Edit the selected node</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Workflow name</label>
            <Input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Status: {status}</Badge>
            <Badge variant="outline">{nodes.length} nodes</Badge>
            <Badge variant="outline">{edges.length} connections</Badge>
          </div>

          {selectedNode ? (
            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-sm font-semibold text-zinc-100">{selectedNode.data.label}</div>
              <div className="text-xs text-zinc-500">{selectedNode.type} node</div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Label</label>
                <Input
                  value={selectedNode.data.label}
                  onChange={(event) =>
                    setNodes((current) =>
                      current.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, label: event.target.value } }
                          : node,
                      ),
                    )
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Description</label>
                <Input
                  value={selectedNode.data.description ?? ''}
                  onChange={(event) =>
                    setNodes((current) =>
                      current.map((node) =>
                        node.id === selectedNode.id
                          ? { ...node, data: { ...node.data, description: event.target.value } }
                          : node,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-sm text-zinc-500">
              Select a node to edit its properties.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatus('draft')}>Save</Button>
            <Button onClick={() => setStatus('active')}>Publish</Button>
            <Button variant="outline" onClick={() => setStatus('draft')}>Test</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function WorkflowBuilderPage() {
  usePageView('/dashboard/workflows/builder');
  const params = useParams<{ id: string }>();
  const workflowId = params?.id ?? 'demo';

  return (
    <ReactFlowProvider>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Workflow Builder</h1>
          <p className="mt-1 text-sm text-zinc-400">Build a four-step demo workflow with draggable nodes</p>
        </div>
        <Badge variant="outline">/{workflowId}/builder</Badge>
      </div>
      <BuilderCanvas workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
