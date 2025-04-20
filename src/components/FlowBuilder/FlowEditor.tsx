
import React, { useCallback, useRef, useState, DragEvent } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  Node,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toast } from "sonner";

import StartCallNode from './nodes/StartCallNode';
import PlayAudioNode from './nodes/PlayAudioNode';
import AINode from './nodes/AINode';
import EndCallNode from './nodes/EndCallNode';
import LogicNode, { BranchNode } from './nodes/LogicNode';
import GatherNode from './nodes/GatherNode';
import ApiRequestNode from './nodes/ApiRequestNode';
import TransferCallNode from './nodes/TransferCallNode';
import Sidebar from './Sidebar';

// Define the NodeTypes with type any to avoid TypeScript errors
// This is a compromise for now, but the proper solution would involve 
// defining proper type interfaces for all node types
const nodeTypes: NodeTypes = {
  startCall: StartCallNode as any,
  playAudio: PlayAudioNode as any,
  aiNode: AINode as any,
  endCall: EndCallNode as any,
  logic: LogicNode as any,
  gather: GatherNode as any,
  apiRequest: ApiRequestNode as any,
  transferCall: TransferCallNode as any,
  default: BranchNode as any, // Use our custom BranchNode component for condition nodes
};

const initialNodes = [
  {
    id: 'start-1',
    type: 'startCall',
    data: { label: 'Start Call' },
    position: { x: 250, y: 50 },
  }
];

let id = 0;
const getId = () => `node_${id++}`;

const FlowEditorContent: React.FC = () => {
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Get ReactFlow utilities from hook
  const reactFlowInstance = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onSave = useCallback(() => {
    if (!reactFlowInstance) return;

    const flow = {
      name: workflowName,
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onChange: undefined // Remove function references before saving
        }
      })),
      edges,
    };
    
    console.log('Workflow saved:', flow);
    
    // In a real scenario, this would be sent to the backend
    // Mock API call to simulate saving to the backend
    setTimeout(() => {
      toast.success("Workflow saved successfully!");
    }, 500);
    
    // Store in localStorage for demo purposes
    try {
      localStorage.setItem('savedWorkflow', JSON.stringify(flow));
    } catch (error) {
      console.error('Error saving workflow to localStorage:', error);
    }
  }, [nodes, edges, reactFlowInstance, workflowName]);

  const onNewWorkflow = useCallback(() => {
    if (window.confirm("Create a new workflow? Any unsaved changes will be lost.")) {
      setNodes(initialNodes);
      setEdges([]);
      setWorkflowName("New Workflow");
      toast.info("New workflow created");
    }
  }, [setNodes, setEdges]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { 
          label: type,
          onChange: (params: any) => {
            setNodes(nodes => 
              nodes.map(node => {
                if (node.id === newNode.id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      ...params,
                    },
                  };
                }
                return node;
              })
            );
          }
        },
      };

      setNodes(nds => [...nds, newNode]);
    },
    [reactFlowInstance, setNodes]
  );

  // Handle node deletion via keyboard
  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Get selected nodes
      const selectedNodeIds = nodes
        .filter((node: any) => node.selected)
        .map(node => node.id);
      
      if (selectedNodeIds.length > 0) {
        // Remove selected nodes
        setNodes((nds) => nds.filter((node) => !selectedNodeIds.includes(node.id)));
        // Remove edges connected to deleted nodes
        setEdges((eds) => eds.filter((edge) => 
          !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
        ));
      }
    }
  }, [nodes, setNodes, setEdges]);

  return (
    <div className="w-full h-full flex">
      <Sidebar />
      <div className="flex-grow h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onKeyDown={onKeyDown}
          fitView
          attributionPosition="bottom-right"
          className="bg-gray-50"
        >
          <Panel position="top-right" className="flex gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Workflow Name"
            />
            <button 
              onClick={onNewWorkflow}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md"
            >
              New Workflow
            </button>
            <button 
              onClick={onSave}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Save Workflow
            </button>
          </Panel>
          <Controls />
          <MiniMap nodeStrokeWidth={3} />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

// Wrapper with ReactFlowProvider
const FlowEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowEditorContent />
    </ReactFlowProvider>
  );
};

export default FlowEditor;
