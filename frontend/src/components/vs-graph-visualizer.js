import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const gradientColors = [
  { 
    name: 'chrome-red', 
    colors: ['rgba(200, 200, 200, 0.95)', 'rgba(255, 255, 255, 1)', 'rgba(240, 240, 240, 0.9)'],
    highlight: 'rgba(255, 255, 255, 0.35)'
  },
  { 
    name: 'chrome-dark', 
    colors: ['rgba(200, 200, 200, 0.95)', 'rgba(255, 255, 255, 1)', 'rgba(240, 240, 240, 0.9)'],
    highlight: 'rgba(255, 255, 255, 0.35)'
  },
  { 
    name: 'chrome-light', 
    colors: ['rgba(200, 200, 200, 0.95)', 'rgba(255, 255, 255, 1)', 'rgba(240, 240, 240, 0.9)'],
    highlight: 'rgba(255, 255, 255, 0.35)'
  },
];

export default function GraphVisualizer({ graphData, isVisible, highlightedEdges = new Set(), animatingEdges = new Map(), onNodeClick = null }) {
  const containerRef = useRef(null);
  const fgRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const shortlistRankings = useMemo(() => {
    if (!graphData || !graphData.nodes) return new Map();
    
    const shortlistNodes = graphData.nodes
      .filter(node => node.group === 'shortlist')
      .map(node => {
        const labelStr = node.label || '';
        const scoreMatch = labelStr.match(/(\d+\.?\d*)/);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
        return { node, score, id: node.id };
      });
    
    shortlistNodes.sort((a, b) => b.score - a.score);
    
    const rankingMap = new Map();
    shortlistNodes.forEach((item, index) => {
      const rank = index + 2;
      let suffix = 'th';
      if (rank === 2) suffix = 'nd';
      else if (rank === 3) suffix = 'rd';
      else if (rank % 10 === 1 && rank % 100 !== 11) suffix = 'st';
      else if (rank % 10 === 2 && rank % 100 !== 12) suffix = 'nd';
      else if (rank % 10 === 3 && rank % 100 !== 13) suffix = 'rd';
      
      rankingMap.set(item.id, `${rank}${suffix} Best Venue`);
    });
    
    return rankingMap;
  }, [graphData]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600,
        });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (fgRef.current && containerRef.current) {
      const container = containerRef.current;
      container.style.position = 'relative';
      
      // Create grain overlay if it doesn't exist
      let grainOverlay = container.querySelector('.grain-overlay');
      if (!grainOverlay) {
        grainOverlay = document.createElement('div');
        grainOverlay.className = 'grain-overlay';
        grainOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          opacity: 0.4;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='0.5'/%3E%3C/svg%3E");
          background-size: 400px 400px;
          mix-blend-mode: overlay;
        `;
        container.appendChild(grainOverlay);
      }
    }
  }, [graphData]);

  // Get node gradient color based on node type/position
  const getNodeGradientColor = useCallback((node) => {
    // Check if node is root (id contains "root")
    if (node.id && (node.id.toLowerCase().includes('root') || node.type === 'root')) {
      // Special color for root nodes - use a distinct color (e.g., gold/yellow gradient)
      return {
        name: 'root',
        colors: ['rgba(255, 215, 0, 0.9)', 'rgba(255, 223, 0, 0.95)', 'rgba(255, 235, 59, 1)'], // Gold gradient
        highlight: 'rgba(255, 255, 255, 0.4)'
      };
    }
    
    // Check if node is final (id contains "final")
    if (node.id && node.id.toLowerCase().includes('final')) {
      // Special color for final nodes - use a distinct color (e.g., green gradient)
      return {
        name: 'final',
        colors: ['rgba(34, 197, 94, 0.9)', 'rgba(74, 222, 128, 0.95)', 'rgba(134, 239, 172, 1)'], // Green gradient
        highlight: 'rgba(255, 255, 255, 0.4)'
      };
    }
    
    // Check for group === "best" - blue gradient
    if (node.group === 'best') {
      return {
        name: 'best',
        colors: ['rgba(59, 130, 246, 0.9)', 'rgba(96, 165, 250, 0.95)', 'rgba(147, 197, 253, 1)'], // Blue gradient
        highlight: 'rgba(255, 255, 255, 0.4)'
      };
    }
    
    // Check for group === "shortlist" - yellow gradient
    if (node.group === 'shortlist') {
      return {
        name: 'shortlist',
        colors: ['rgba(255, 215, 0, 0.9)', 'rgba(255, 223, 0, 0.95)', 'rgba(255, 235, 59, 1)'], // Yellow gradient
        highlight: 'rgba(255, 255, 255, 0.4)'
      };
    }
    
    // Distribute colors based on node type or index
    const nodeIndex = node.__index !== undefined ? node.__index : 
                      (node.id ? parseInt(node.id.replace(/\D/g, '')) || 0 : 0);
    const colorSet = gradientColors[nodeIndex % gradientColors.length];
    return colorSet;
  }, []);

  // Helper function to format node labels
  const formatNodeLabel = useCallback((node) => {
    let label = node.label || node.id || '';
    const nodeId = node.id ? node.id.toLowerCase() : '';
    
    // For nodes with group === "best", name as "Best Venue"
    if (node.group === 'best') {
      return 'Best Venue';
    }
    
    // For nodes with group === "shortlist", use calculated ranking
    if (node.group === 'shortlist' && node.id) {
      const ranking = shortlistRankings.get(node.id);
      return ranking || 'Shortlist Venue';
    }
    
    // For step_scoring, show as "Score"
    if (nodeId === 'step_scoring') {
      return 'Score';
    }
    
    // For step_coverage, remove bracket part from label
    if (nodeId === 'step_coverage') {
      // Remove brackets and their contents, handle multiple bracket patterns
      label = label.replace(/\[[^\]]*\]/g, '').trim(); // Match [anything inside brackets]
      label = label.replace(/\([^)]*\)/g, '').trim(); // Also remove parentheses just in case
      return label || 'Step Coverage'; // Fallback if label becomes empty
    }
    
    // For step_capacity, remove bracket part from label
    if (nodeId === 'step_capacity') {
      // Remove brackets and their contents, handle multiple bracket patterns
      label = label.replace(/\[[^\]]*\]/g, '').trim(); // Match [anything inside brackets]
      label = label.replace(/\([^)]*\)/g, '').trim(); // Also remove parentheses just in case
      return label || 'Step Capacity'; // Fallback if label becomes empty
    }
    
    return label;
  }, [shortlistRankings]);

  const drawNode = useCallback((node, ctx) => {
    // Don't display nodes with id containing "root" or "final"
    const nodeId = node.id ? node.id.toLowerCase() : '';
    if (nodeId.includes('root') || nodeId === 'final' || node.type === 'root') {
      return; // Skip drawing root and final nodes
    }
    
    // Validate node position - ensure x and y are finite numbers
    if (typeof node.x !== 'number' || typeof node.y !== 'number' || 
        !isFinite(node.x) || !isFinite(node.y)) {
      return; // Skip drawing if position is invalid
    }
    
    // Vary node size - some large, some small like in the picture
    const baseSize = node.size || 8;
    const nodeIndex = node.__index !== undefined ? node.__index : 
                      (node.id ? parseInt(node.id.replace(/\D/g, '')) || 0 : 0);
    
    // For best and shortlist venue nodes, use consistent size
    let sizeVariation;
    if (node.group === 'best' || node.group === 'shortlist') {
      sizeVariation = 1.5; // Consistent size for all venue nodes (best and shortlist)
    } else {
      // Create size variation: some nodes are larger (important nodes)
      sizeVariation = (nodeIndex % 3 === 0) ? 1.8 : 
                      (nodeIndex % 5 === 0) ? 1.4 : 
                      (nodeIndex % 7 === 0) ? 1.6 : 0.8;
    }
    
    const size = baseSize * sizeVariation;
    
    // Validate size
    if (!isFinite(size) || size <= 0) {
      return; // Skip drawing if size is invalid
    }
    
    const colorSet = getNodeGradientColor(node);
    const nodeGradientColors = colorSet.colors;
    
    // Draw chrome/metallic gradient circle node
    try {
      // Create chrome gradient from dark to light (110deg like the background)
      const chromeGradient = ctx.createLinearGradient(
        node.x - size, node.y - size * 1.5,
        node.x + size, node.y + size * 1.5
      );
      
      // Add chrome gradient stops based on color set
      if (colorSet.name === 'root') {
        // Gold/yellow gradient for root nodes
        chromeGradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)'); // Gold
        chromeGradient.addColorStop(0.5, 'rgba(255, 223, 0, 0.95)'); // Light gold
        chromeGradient.addColorStop(1, 'rgba(255, 235, 59, 1)'); // Yellow
      } else if (colorSet.name === 'final') {
        // Green gradient for final nodes
        chromeGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)'); // Green
        chromeGradient.addColorStop(0.5, 'rgba(74, 222, 128, 0.95)'); // Light green
        chromeGradient.addColorStop(1, 'rgba(134, 239, 172, 1)'); // Lighter green
      } else if (colorSet.name === 'best') {
        // Blue gradient for best venue nodes
        chromeGradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)'); // Blue
        chromeGradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.95)'); // Light blue
        chromeGradient.addColorStop(1, 'rgba(147, 197, 253, 1)'); // Lighter blue
      } else if (colorSet.name === 'shortlist') {
        // Yellow gradient for shortlist venue nodes
        chromeGradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)'); // Gold
        chromeGradient.addColorStop(0.5, 'rgba(255, 223, 0, 0.95)'); // Light gold
        chromeGradient.addColorStop(1, 'rgba(255, 235, 59, 1)'); // Yellow
      } else if (colorSet.name === 'chrome-red') {
        // chromeGradient.addColorStop(0, 'rgba(220, 40, 40, 0.95)');
        // chromeGradient.addColorStop(0.25, 'rgba(180, 20, 20, 0.9)');
        // chromeGradient.addColorStop(0.5, 'rgba(90, 10, 10, 0.85)');
        // chromeGradient.addColorStop(0.75, 'rgba(100, 100, 100, 0.9)');
        // chromeGradient.addColorStop(1, 'rgba(200, 200, 200, 0.95)');
        chromeGradient.addColorStop(0, 'rgba(100, 100, 100, 0.9)');
        chromeGradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.95)');
        chromeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
      } else if (colorSet.name === 'chrome-dark') {
        // chromeGradient.addColorStop(0, 'rgba(15, 15, 15, 0.95)');
        // chromeGradient.addColorStop(0.5, 'rgba(30, 30, 30, 1)');
        // chromeGradient.addColorStop(0.75, 'rgba(100, 100, 100, 0.9)');
        // chromeGradient.addColorStop(1, 'rgba(200, 200, 200, 0.95)');
        chromeGradient.addColorStop(0, 'rgba(100, 100, 100, 0.9)');
        chromeGradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.95)');
        chromeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
      } else {
        chromeGradient.addColorStop(0, 'rgba(100, 100, 100, 0.9)');
        chromeGradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.95)');
        chromeGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
      }
      
      ctx.fillStyle = chromeGradient;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fill();
      
      // Add highlight streaks (reflection effect) at top
      const highlightGradient = ctx.createRadialGradient(
        node.x - size * 0.3, node.y - size * 0.5,
        0,
        node.x - size * 0.3, node.y - size * 0.5,
        size * 1.5
      );
      highlightGradient.addColorStop(0, colorSet.highlight || 'rgba(255, 255, 255, 0.25)');
      highlightGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = highlightGradient;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      
      // Add subtle border with chrome gradient
      const borderGradient = ctx.createLinearGradient(
        node.x - size, node.y - size,
        node.x + size, node.y + size
      );
      borderGradient.addColorStop(0, nodeGradientColors[0] || 'rgba(255, 255, 255, 0.5)');
      borderGradient.addColorStop(1, nodeGradientColors[nodeGradientColors.length - 1] || 'rgba(255, 255, 255, 0.8)');
      
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      
    } catch (e) {
      // Fallback to solid color if gradient creation fails
      ctx.fillStyle = nodeGradientColors[0] || 'rgba(200, 200, 200, 0.9)';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.strokeStyle = nodeGradientColors[1] || 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;

    // Format and draw label text
    const formattedLabel = formatNodeLabel(node);
    if (formattedLabel) {
      try {
        // Adjust font size based on node size, with minimum readable size
        const fontSize = Math.max(7, Math.min(size * 0.5, 11));
        
        // For smaller nodes, draw text outside or use smaller font
        const textY = size < 8 ? node.y + size + fontSize + 2 : node.y;
        const textX = size < 8 ? node.x : node.x;
        
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Create gradient for text - always white for all nodes
        const textGradient = ctx.createLinearGradient(
          textX - size * 1.5, textY,
          textX + size * 1.5, textY
        );
        
        // Always use white text for all nodes
        textGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        textGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
        
        ctx.fillStyle = textGradient;
        ctx.globalAlpha = 0.95;
        
        // Draw text with shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(formattedLabel, textX, textY);
        
        // Reset shadow and alpha
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 1.0;
      } catch (e) {
        // Fallback to solid color text if gradient creation fails - always white
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        const textY = size < 8 ? node.y + size + 10 : node.y;
        ctx.fillText(formattedLabel, node.x, textY);
        ctx.globalAlpha = 1.0;
      }
    }
  }, [getNodeGradientColor, formatNodeLabel]);

  const drawLink = useCallback((link, ctx) => {
    // Validate link source and target positions
    if (!link.source || !link.target) return;
    if (typeof link.source.x !== 'number' || typeof link.source.y !== 'number' ||
        typeof link.target.x !== 'number' || typeof link.target.y !== 'number' ||
        !isFinite(link.source.x) || !isFinite(link.source.y) ||
        !isFinite(link.target.x) || !isFinite(link.target.y)) {
      return; // Skip drawing if positions are invalid
    }

    // Check if this edge is highlighted or animating
    // Extract IDs from source and target (handle both string IDs and node objects)
    let sourceId, targetId;
    if (typeof link.source === 'string') {
      sourceId = link.source;
    } else if (link.source && link.source.id) {
      sourceId = link.source.id;
    } else {
      sourceId = null;
    }
    
    if (typeof link.target === 'string') {
      targetId = link.target;
    } else if (link.target && link.target.id) {
      targetId = link.target.id;
    } else {
      targetId = null;
    }
    
    // Skip if we don't have valid IDs
    if (!sourceId || !targetId) return;
    
    // Don't display edges connected to root or final nodes
    const sourceIdLower = sourceId.toLowerCase();
    const targetIdLower = targetId.toLowerCase();
    if (sourceIdLower.includes('root') || sourceIdLower === 'final' || 
        targetIdLower.includes('root') || targetIdLower === 'final') {
      return; // Skip drawing edges connected to root or final nodes
    }
    
    const edgeKey1 = `${sourceId}-${targetId}`;
    const edgeKey2 = `${targetId}-${sourceId}`;
    
    // Try both directions for edge matching
    const edgeKey = highlightedEdges.has(edgeKey1) ? edgeKey1 : 
                    highlightedEdges.has(edgeKey2) ? edgeKey2 :
                    animatingEdges.has(edgeKey1) ? edgeKey1 :
                    animatingEdges.has(edgeKey2) ? edgeKey2 : null;
    
    const isHighlighted = highlightedEdges.has(edgeKey1) || highlightedEdges.has(edgeKey2);
    const animationProgress = animatingEdges.get(edgeKey1) || animatingEdges.get(edgeKey2) || null;
    
      // Chrome/metallic gradient edges
      try {
        const midX = (link.source.x + link.target.x) / 2;
        const midY = (link.source.y + link.target.y) / 2;
        
        // Always draw the full edge in normal style first (as background)
        const edgeGradient = ctx.createLinearGradient(
          link.source.x, link.source.y,
          link.target.x, link.target.y
        );
        edgeGradient.addColorStop(0, 'rgba(220, 40, 40, 0.8)');
        edgeGradient.addColorStop(0.25, 'rgba(100, 100, 100, 0.85)');
        edgeGradient.addColorStop(0.75, 'rgba(200, 200, 200, 0.9)');
        edgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
        
        ctx.strokeStyle = edgeGradient;
        ctx.lineWidth = 0.75;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      
      // Draw highlighted/animating edge on top
      // Animation direction: Follow source->target as specified in graphPathVisualisation
      // graphPathVisualisation stores edges as: { source: "...", target: "..." }
      // We animate from source node to target node according to backend data
      if (isHighlighted || animationProgress !== null) {
        // Determine source and target nodes based on edgeKey matching
        // edgeKey from graphPathVisualisation is stored as "source-target"
        let sourceX, sourceY, targetX, targetY;
        
        // Check which edgeKey matches to determine direction
        // edgeKey1 = link.source-link.target (as stored in graph)
        // edgeKey2 = link.target-link.source (reversed in graph)
        
        if (highlightedEdges.has(edgeKey1) || animatingEdges.has(edgeKey1)) {
          // edgeKey1 matches: graph link matches source->target direction
          // link.source = source, link.target = target
          sourceX = link.source.x;
          sourceY = link.source.y;
          targetX = link.target.x;
          targetY = link.target.y;
        } else if (highlightedEdges.has(edgeKey2) || animatingEdges.has(edgeKey2)) {
          // edgeKey2 matches: graph link is reversed, so we need to reverse to get source->target
          // link.source = target, link.target = source in graph
          // So to animate source->target, we animate from link.target to link.source
          sourceX = link.target.x;
          sourceY = link.target.y;
          targetX = link.source.x;
          targetY = link.source.y;
        } else {
          // Default to source->target based on link (fallback)
          sourceX = link.source.x;
          sourceY = link.source.y;
          targetX = link.target.x;
          targetY = link.target.y;
        }
        
        // Always animate from source to target (according to backend data)
        let endX, endY;
        if (animationProgress !== null && animationProgress < 1) {
          // Progressive animation: draw from source towards target
          endX = sourceX + (targetX - sourceX) * animationProgress;
          endY = sourceY + (targetY - sourceY) * animationProgress;
        } else {
          // Fully highlighted: draw full edge
          endX = targetX;
          endY = targetY;
        }
        
        // Highlighted edges: brighter, with blue gradient and glow effect
        // Create blue gradient for highlighted edges (from source to target)
        const highlightGradient = ctx.createLinearGradient(
          sourceX, sourceY,
          endX, endY
        );
        highlightGradient.addColorStop(0, 'rgba(59, 130, 246, 1)'); // Light blue
        highlightGradient.addColorStop(0.35, 'rgba(37, 99, 235, 1)'); // Medium blue
        highlightGradient.addColorStop(0.65, 'rgba(29, 78, 216, 1)'); // Dark blue
        highlightGradient.addColorStop(1, 'rgba(30, 64, 175, 1)'); // Darker blue
        
        // Draw glow effect
        ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = highlightGradient;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = animationProgress !== null && animationProgress < 1 ? 0.7 + (animationProgress * 0.3) : 1.0;
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
      
      // Draw edge label if it exists (after all edge drawing)
      if (link.label) {
        ctx.font = '8px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Create chrome gradient for edge text
        const textGradient = ctx.createLinearGradient(
          midX - 30, midY,
          midX + 30, midY
        );
        textGradient.addColorStop(0, 'rgba(220, 40, 40, 0.95)');
        textGradient.addColorStop(0.5, 'rgba(200, 200, 200, 0.95)');
        textGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
        
        ctx.fillStyle = textGradient;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.fillText(link.label, midX, midY);
        
        ctx.shadowBlur = 0;
      }
    } catch (e) {
      // Fallback to solid color edge
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
  }, [highlightedEdges, animatingEdges]);

  if (!isVisible || !graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-white/40 text-sm">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full animate-fadeIn relative" ref={containerRef}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeColor="rgba(200, 200, 200, 0.9)"
        linkColor="rgba(200, 200, 200, 0.8)"
        nodeCanvasObject={drawNode}
        linkCanvasObject={drawLink}
        nodeLabel={(node) => {
          // Use formatNodeLabel function for consistency
          // Calculate shortlist ranking inline for tooltip
          let label = node.label || node.id || '';
          const nodeId = node.id ? node.id.toLowerCase() : '';
          
          // For nodes with group === "best", name as "Best Venue"
          if (node.group === 'best') {
            return 'Best Venue';
          }
          
          // For nodes with group === "shortlist", calculate ranking
          if (node.group === 'shortlist' && node.id) {
            const ranking = shortlistRankings.get(node.id);
            return ranking || 'Shortlist Venue';
          }
          
          // For step_scoring, show as "Score"
          if (nodeId === 'step_scoring') {
            return 'Score';
          }
          
          // For step_coverage, remove bracket part from label
          if (nodeId === 'step_coverage') {
            label = label.replace(/\[[^\]]*\]/g, '').trim();
            label = label.replace(/\([^)]*\)/g, '').trim();
            return label || 'Step Coverage';
          }
          
          // For step_capacity, remove bracket part from label
          if (nodeId === 'step_capacity') {
            label = label.replace(/\[[^\]]*\]/g, '').trim();
            label = label.replace(/\([^)]*\)/g, '').trim();
            return label || 'Step Capacity';
          }
          
          return label;
        }}
        linkLabel={(link) => link.label || ''}
        linkDirectionalArrowLength={0}
        linkCurvature={0}
        linkDistance={(link) => 200}
        cooldownTicks={300}
        onEngineStop={() => {
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 50);
          }
        }}
        onNodeClick={(node) => {
          if (onNodeClick && node) {
            onNodeClick(node);
          }
        }}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="transparent"
        nodeRelSize={15}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        d3Force={(d3) => {
          d3.force('charge').strength(-800).distanceMax(1500);
          d3.force('link').distance(200).strength(0.3);
          d3.force('center').strength(0.1);
        }}
      />
    </div>
  );
}

